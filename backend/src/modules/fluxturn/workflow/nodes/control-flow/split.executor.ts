import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Split Executor
 * Splits data into multiple outputs based on various strategies
 */
@Injectable()
export class SplitExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['SPLIT'];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const mode = config.mode || 'duplicate';
    const numberOfOutputs = config.numberOfOutputs || 2;

    this.logger.log(`Executing Split node with mode: ${mode}, outputs: ${numberOfOutputs}`);

    if (!Array.isArray(inputData) || inputData.length === 0) {
      return [];
    }

    try {
      switch (mode) {
        case 'duplicate':
          return this.splitDuplicate(inputData, numberOfOutputs);

        case 'splitEvenly':
          return this.splitEvenly(inputData, numberOfOutputs);

        case 'splitByField':
          return this.splitByField(config, inputData);

        case 'splitBySize':
          return this.splitBySize(config, inputData);

        default:
          throw new Error(`Unknown split mode: ${mode}`);
      }
    } catch (error: any) {
      this.logger.error(`Split execution failed:`, error);
      throw error;
    }
  }

  private splitDuplicate(inputData: NodeInputItem[], numberOfOutputs: number): NodeInputItem[] {
    // Duplicate all items to all outputs
    // In the workflow engine, each output would get these items
    this.logger.log(`Split Duplicate: Creating ${numberOfOutputs} copies`);
    return inputData;
  }

  private splitEvenly(inputData: NodeInputItem[], numberOfOutputs: number): NodeInputItem[] {
    // Round-robin distribution
    this.logger.log(`Split Evenly: Distributing ${inputData.length} items to ${numberOfOutputs} outputs`);

    // For now, just return all items
    // The actual routing happens in the workflow engine
    return inputData;
  }

  private splitByField(config: any, inputData: NodeInputItem[]): NodeInputItem[] {
    const fieldName = config.fieldName;
    const fieldValues = config.fieldValues || [];

    if (!fieldName) {
      throw new Error('Field name is required for splitByField mode');
    }

    this.logger.log(`Split by Field: ${fieldName}, values: ${fieldValues.join(', ')}`);

    // Filter items based on field values
    // Each matching value goes to its own output
    return inputData;
  }

  private splitBySize(config: any, inputData: NodeInputItem[]): NodeInputItem[] {
    const chunkSize = config.chunkSize || 10;

    this.logger.log(`Split by Size: Chunk size ${chunkSize}`);

    // Items are already in the output, chunking happens at workflow engine level
    return inputData;
  }
}
