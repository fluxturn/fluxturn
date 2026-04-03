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
 * Extended result type for multi-output nodes like IF
 */
export interface IfNodeExecutionResult {
  outputs: NodeInputItem[][];
  trueOutput: NodeInputItem[];
  falseOutput: NodeInputItem[];
}

/**
 * IF Condition Executor
 * Evaluates conditions and routes items to true or false outputs
 */
@Injectable()
export class IfExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['IF_CONDITION', 'IF'];

  constructor(
    @Inject(forwardRef(() => ControlFlowService))
    private readonly controlFlowService: ControlFlowService,
  ) {
    super('IfExecutor');
  }

  /**
   * Execute IF condition and return results
   * Returns items that match the conditions (for single output use)
   * Use executeWithBranches() for multi-output branching
   */
  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const nodeName = config.label || node.id;

    this.logger.log(`=== IF NODE EXECUTION ===`);
    this.logger.log(`Node: ${nodeName}`);
    this.logger.log(`Input data count: ${inputData.length}`);
    this.logger.log(`Conditions: ${JSON.stringify(config.conditions)}`);

    // If no conditions configured, route all to false
    if (!config.conditions) {
      this.logger.log('No conditions configured, all items go to false branch');
      return [];
    }

    // Prepare input data for condition evaluation
    const items = inputData.map(item => item.json || item);

    // Execute IF logic via ControlFlowService
    const result = await this.controlFlowService.executeIfNode(
      {
        conditions: config.conditions,
        ignoreCase: config.ignoreCase ?? true,
      },
      items,
    );

    this.logger.log(`IF Node Result - True: ${result.trueCount}, False: ${result.falseCount}`);
    this.logger.log(`=== IF NODE EXECUTION COMPLETE ===`);

    // For standard execution, return true output items
    return result.trueOutput.map(json => ({ json }));
  }

  /**
   * Execute IF condition with branching support
   * Returns both true and false outputs for multi-output routing
   */
  async executeWithBranches(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<IfNodeExecutionResult> {
    const config = node.data || {};
    const nodeName = config.label || node.id;

    this.logger.log(`=== IF NODE EXECUTION (BRANCHED) ===`);
    this.logger.log(`Node: ${nodeName}`);
    this.logger.log(`Input data count: ${inputData.length}`);

    // If no conditions configured, route all to false
    if (!config.conditions) {
      this.logger.log('No conditions configured, all items go to false branch');
      const allItems = inputData.map(item => ({ json: item.json || item }));
      return {
        outputs: [[], allItems],
        trueOutput: [],
        falseOutput: allItems,
      };
    }

    // Prepare input data for condition evaluation
    const items = inputData.map(item => item.json || item);

    // Execute IF logic via ControlFlowService
    const result = await this.controlFlowService.executeIfNode(
      {
        conditions: config.conditions,
        ignoreCase: config.ignoreCase ?? true,
      },
      items,
    );

    const trueOutput = result.trueOutput.map(json => ({ json }));
    const falseOutput = result.falseOutput.map(json => ({ json }));

    this.logger.log(`IF Node Result - True: ${trueOutput.length}, False: ${falseOutput.length}`);
    this.logger.log(`=== IF NODE EXECUTION (BRANCHED) COMPLETE ===`);

    return {
      outputs: [trueOutput, falseOutput],
      trueOutput,
      falseOutput,
    };
  }

  /**
   * Validate IF node configuration
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
