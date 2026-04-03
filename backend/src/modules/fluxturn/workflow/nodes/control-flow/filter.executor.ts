import { Injectable, Inject, forwardRef } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';
import { ControlFlowService } from '../../services/control-flow.service';

/**
 * Extended result type for FILTER node with kept and discarded items
 */
export interface FilterNodeExecutionResult {
  outputs: NodeInputItem[][];
  kept: NodeInputItem[];
  discarded: NodeInputItem[];
  keptCount: number;
  discardedCount: number;
}

/**
 * FILTER Executor
 * Filters items based on conditions, keeping matching items and optionally discarding others
 */
@Injectable()
export class FilterExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['FILTER'];

  constructor(
    @Inject(forwardRef(() => ControlFlowService))
    private readonly controlFlowService: ControlFlowService,
  ) {
    super('FilterExecutor');
  }

  /**
   * Execute FILTER node and return kept items only
   * Use executeWithDiscard() to also get discarded items
   */
  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const nodeName = config.label || node.id;

    this.logger.log(`=== FILTER NODE EXECUTION ===`);
    this.logger.log(`Node: ${nodeName}`);
    this.logger.log(`Input data count: ${inputData.length}`);
    this.logger.log(`Conditions: ${JSON.stringify(config.conditions)}`);

    // If no conditions configured, pass through all items
    if (!config.conditions) {
      this.logger.log('No conditions configured, keeping all items');
      return inputData;
    }

    // Prepare input data for condition evaluation
    const items = inputData.map(item => item.json || item);

    // Execute FILTER logic via ControlFlowService
    const result = await this.controlFlowService.executeFilterNode(
      {
        conditions: config.conditions,
        ignoreCase: config.ignoreCase ?? true,
      },
      items,
    );

    this.logger.log(`FILTER Node Result - Kept: ${result.keptCount}, Discarded: ${result.discardedCount}`);
    this.logger.log(`=== FILTER NODE EXECUTION COMPLETE ===`);

    // Return only kept items
    return result.kept.map(json => ({ json }));
  }

  /**
   * Execute FILTER node with both kept and discarded outputs
   * Returns both kept and discarded items for multi-output routing
   */
  async executeWithDiscard(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<FilterNodeExecutionResult> {
    const config = node.data || {};
    const nodeName = config.label || node.id;

    this.logger.log(`=== FILTER NODE EXECUTION (WITH DISCARD) ===`);
    this.logger.log(`Node: ${nodeName}`);
    this.logger.log(`Input data count: ${inputData.length}`);

    // If no conditions configured, keep all items
    if (!config.conditions) {
      this.logger.log('No conditions configured, keeping all items');
      return {
        outputs: [inputData, []],
        kept: inputData,
        discarded: [],
        keptCount: inputData.length,
        discardedCount: 0,
      };
    }

    // Prepare input data for condition evaluation
    const items = inputData.map(item => item.json || item);

    // Execute FILTER logic via ControlFlowService
    const result = await this.controlFlowService.executeFilterNode(
      {
        conditions: config.conditions,
        ignoreCase: config.ignoreCase ?? true,
      },
      items,
    );

    const kept = result.kept.map(json => ({ json }));
    const discarded = result.discarded.map(json => ({ json }));

    this.logger.log(`FILTER Node Result - Kept: ${kept.length}, Discarded: ${discarded.length}`);
    this.logger.log(`=== FILTER NODE EXECUTION (WITH DISCARD) COMPLETE ===`);

    return {
      outputs: [kept, discarded],
      kept,
      discarded,
      keptCount: kept.length,
      discardedCount: discarded.length,
    };
  }

  /**
   * Validate FILTER node configuration
   */
  validate(node: NodeData): string[] {
    const errors: string[] = [];
    const config = node.data || {};

    if (!config.conditions) {
      errors.push('Conditions are not configured');
    } else if (!config.conditions.conditions || config.conditions.conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    return errors;
  }
}
