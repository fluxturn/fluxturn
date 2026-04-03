import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Wait Executor
 * Pauses workflow execution before continuing
 * Supports: time interval, specific time, webhook, and form submission
 */
@Injectable()
export class WaitExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['WAIT'];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const resume = config.resume || 'timeInterval';

    this.logger.log(`=== WAIT NODE EXECUTION ===`);
    this.logger.log(`Resume mode: ${resume}`);

    try {
      switch (resume) {
        case 'timeInterval':
          return await this.waitTimeInterval(inputData, config);

        case 'specificTime':
          return await this.waitSpecificTime(inputData, config);

        case 'webhook':
          return await this.waitWebhook(inputData, config);

        case 'form':
          return await this.waitForm(inputData, config);

        default:
          throw new Error(`Unknown wait resume mode: ${resume}`);
      }
    } catch (error: any) {
      this.logger.error(`Wait node execution failed:`, error.message);
      const nodeName = node.data?.label || node.id;
      const wrappedError = new Error(
        `Node "${nodeName}" wait execution failed: ${error.message}`
      );
      wrappedError.name = 'WaitNodeError';
      (wrappedError as any).originalError = error;
      throw wrappedError;
    }
  }

  private async waitTimeInterval(inputData: NodeInputItem[], config: any): Promise<NodeInputItem[]> {
    const unit = config.unit || 'seconds';
    let amount = config.amount !== undefined ? config.amount : 5;

    this.logger.log(`Wait time interval: ${amount} ${unit}`);

    if (typeof amount !== 'number' || amount < 0) {
      throw new Error(`Invalid wait amount: ${amount}. Must be a number >= 0.`);
    }

    // Convert to milliseconds
    let waitMs = amount * 1000;
    switch (unit) {
      case 'minutes':
        waitMs *= 60;
        break;
      case 'hours':
        waitMs *= 60 * 60;
        break;
      case 'days':
        waitMs *= 60 * 60 * 24;
        break;
    }

    this.logger.log(`Waiting for ${waitMs}ms (${amount} ${unit})`);

    // For long waits, log a warning
    if (waitMs >= 65000) {
      this.logger.warn(`Long wait detected (${waitMs}ms). In production, this should use database-backed waiting.`);
    }

    await new Promise(resolve => setTimeout(resolve, waitMs));
    this.logger.log(`Wait completed`);
    return inputData;
  }

  private async waitSpecificTime(inputData: NodeInputItem[], config: any): Promise<NodeInputItem[]> {
    const dateTimeStr = config.dateTime;

    if (!dateTimeStr) {
      throw new Error('No date/time specified for wait node');
    }

    this.logger.log(`Wait until specific time: ${dateTimeStr}`);

    const targetTime = new Date(dateTimeStr);

    if (isNaN(targetTime.getTime())) {
      throw new Error(`Invalid date/time format: ${dateTimeStr}`);
    }

    const now = new Date();
    const waitMs = Math.max(0, targetTime.getTime() - now.getTime());

    this.logger.log(`Current time: ${now.toISOString()}`);
    this.logger.log(`Target time: ${targetTime.toISOString()}`);
    this.logger.log(`Wait duration: ${waitMs}ms`);

    if (waitMs === 0) {
      this.logger.log(`Target time already passed, continuing immediately`);
      return inputData;
    }

    if (waitMs >= 65000) {
      this.logger.warn(`Long wait detected (${waitMs}ms). In production, this should use database-backed waiting.`);
    }

    await new Promise(resolve => setTimeout(resolve, waitMs));
    this.logger.log(`Wait completed`);
    return inputData;
  }

  private async waitWebhook(inputData: NodeInputItem[], config: any): Promise<NodeInputItem[]> {
    // TODO: Implement database-backed webhook waiting
    this.logger.warn('Webhook wait mode not fully implemented - continuing immediately');
    return inputData;
  }

  private async waitForm(inputData: NodeInputItem[], config: any): Promise<NodeInputItem[]> {
    // TODO: Implement database-backed form waiting
    this.logger.warn('Form wait mode not fully implemented - continuing immediately');
    return inputData;
  }
}
