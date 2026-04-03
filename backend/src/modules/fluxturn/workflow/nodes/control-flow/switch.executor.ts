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
 * Extended result type for multi-output SWITCH nodes
 */
export interface SwitchNodeExecutionResult {
  outputs: Record<string, NodeInputItem[]>;
  routingStats: Record<string, number>;
  unmatchedCount: number;
}

/**
 * SWITCH Executor
 * Routes items to different outputs based on rules or expressions
 */
@Injectable()
export class SwitchExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['SWITCH'];

  constructor(
    @Inject(forwardRef(() => ControlFlowService))
    private readonly controlFlowService: ControlFlowService,
  ) {
    super('SwitchExecutor');
  }

  /**
   * Execute SWITCH node and return first matching output
   * Use executeWithRouting() for full multi-output routing
   */
  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const nodeName = config.label || node.id;

    this.logger.log(`=== SWITCH NODE EXECUTION ===`);
    this.logger.log(`Node: ${nodeName}`);
    this.logger.log(`Input data count: ${inputData.length}`);
    this.logger.log(`Mode: ${config.mode || 'rules'}`);

    // If no rules/expression configured, pass through
    if (!config.rules && !config.expression) {
      this.logger.log('No rules or expression configured, passing through');
      return inputData;
    }

    // Prepare input data
    const items = inputData.map(item => item.json || item);

    // Execute SWITCH logic via ControlFlowService
    const result = await this.controlFlowService.executeSwitchNode(
      {
        mode: config.mode || 'rules',
        rules: config.rules,
        expression: config.expression,
        numberOutputs: config.numberOutputs,
        fallbackOutput: config.fallbackOutput,
        allMatchingOutputs: config.allMatchingOutputs,
        ignoreCase: config.ignoreCase ?? true,
      },
      items,
    );

    this.logger.log(`SWITCH Node Stats: ${JSON.stringify(result.routingStats)}`);
    this.logger.log(`Unmatched count: ${result.unmatchedCount}`);
    this.logger.log(`=== SWITCH NODE EXECUTION COMPLETE ===`);

    // For standard execution, return all matched items combined
    const allMatched: NodeInputItem[] = [];
    for (const outputItems of Object.values(result.outputs)) {
      for (const json of outputItems as any[]) {
        allMatched.push({ json });
      }
    }

    return allMatched;
  }

  /**
   * Execute SWITCH node with full routing information
   * Returns all outputs keyed by output name/index
   */
  async executeWithRouting(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<SwitchNodeExecutionResult> {
    const config = node.data || {};
    const nodeName = config.label || node.id;

    this.logger.log(`=== SWITCH NODE EXECUTION (ROUTED) ===`);
    this.logger.log(`Node: ${nodeName}`);
    this.logger.log(`Input data count: ${inputData.length}`);

    // If no rules/expression configured, create single passthrough output
    if (!config.rules && !config.expression) {
      this.logger.log('No rules or expression configured, passing through to output 0');
      return {
        outputs: { '0': inputData },
        routingStats: { '0': inputData.length },
        unmatchedCount: 0,
      };
    }

    // Prepare input data
    const items = inputData.map(item => item.json || item);

    // Execute SWITCH logic via ControlFlowService
    const result = await this.controlFlowService.executeSwitchNode(
      {
        mode: config.mode || 'rules',
        rules: config.rules,
        expression: config.expression,
        numberOutputs: config.numberOutputs,
        fallbackOutput: config.fallbackOutput,
        allMatchingOutputs: config.allMatchingOutputs,
        ignoreCase: config.ignoreCase ?? true,
      },
      items,
    );

    // Convert raw results to NodeInputItem format
    const outputs: Record<string, NodeInputItem[]> = {};
    for (const [key, outputItems] of Object.entries(result.outputs)) {
      outputs[key] = (outputItems as any[]).map(json => ({ json }));
    }

    this.logger.log(`SWITCH Node Stats: ${JSON.stringify(result.routingStats)}`);
    this.logger.log(`=== SWITCH NODE EXECUTION (ROUTED) COMPLETE ===`);

    return {
      outputs,
      routingStats: result.routingStats,
      unmatchedCount: result.unmatchedCount,
    };
  }

  /**
   * Validate SWITCH node configuration
   */
  validate(node: NodeData): string[] {
    const errors: string[] = [];
    const config = node.data || {};

    if (config.mode === 'rules') {
      if (!config.rules || !config.rules.values || config.rules.values.length === 0) {
        errors.push('At least one rule is required in rules mode');
      }
    } else if (config.mode === 'expression') {
      if (!config.expression) {
        errors.push('Expression is required in expression mode');
      }
    }

    return errors;
  }
}
