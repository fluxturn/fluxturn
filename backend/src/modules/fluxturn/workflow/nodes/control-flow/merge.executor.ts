import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Merge Executor
 * Combines data from multiple inputs using various merge strategies
 */
@Injectable()
export class MergeExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['MERGE'];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const mode = config.mode || 'append';

    this.logger.log(`Executing Merge node with mode: ${mode}`);

    if (!Array.isArray(inputData) || inputData.length === 0) {
      return [];
    }

    try {
      switch (mode) {
        case 'append':
          return this.mergeAppend(inputData);

        case 'combine':
          const combineBy = config.combineBy || 'combineByPosition';
          switch (combineBy) {
            case 'combineByFields':
              return this.mergeCombineByFields(config, inputData);
            case 'combineByPosition':
              return this.mergeCombineByPosition(config, inputData);
            case 'combineAll':
              return this.mergeCombineAll(config, inputData);
            default:
              throw new Error(`Unknown combine mode: ${combineBy}`);
          }

        case 'chooseBranch':
          return this.mergeChooseBranch(config, inputData);

        default:
          throw new Error(`Unknown merge mode: ${mode}`);
      }
    } catch (error: any) {
      this.logger.error(`Merge execution failed:`, error);
      throw error;
    }
  }

  private mergeAppend(inputData: NodeInputItem[]): NodeInputItem[] {
    this.logger.log(`Merge Append: Concatenating ${inputData.length} items`);
    return inputData;
  }

  private mergeCombineByFields(config: any, inputData: NodeInputItem[]): NodeInputItem[] {
    const midpoint = Math.floor(inputData.length / 2);
    const input1 = inputData.slice(0, midpoint);
    const input2 = inputData.slice(midpoint);

    if (input1.length === 0 || input2.length === 0) {
      return inputData;
    }

    const fieldsToMatch = config.fieldsToMatchString || '';
    const joinMode = config.joinMode || 'keepMatches';
    const outputDataFrom = config.outputDataFrom || 'both';
    const clashHandling = config.clashHandling || 'preferInput2';

    const matchFields = fieldsToMatch.split(',').map((f: string) => f.trim()).filter((f: string) => f);

    if (matchFields.length === 0) {
      this.logger.warn('No fields to match specified, returning input1');
      return input1;
    }

    const results: NodeInputItem[] = [];
    const matched1 = new Set<number>();
    const matched2 = new Set<number>();

    for (let i = 0; i < input1.length; i++) {
      for (let j = 0; j < input2.length; j++) {
        const item1 = input1[i].json || input1[i];
        const item2 = input2[j].json || input2[j];

        const allMatch = matchFields.every((field: string) => item1[field] === item2[field]);

        if (allMatch) {
          matched1.add(i);
          matched2.add(j);

          if (outputDataFrom === 'both') {
            const merged = this.mergeObjects(item1, item2, clashHandling);
            results.push({ json: merged });
          } else if (outputDataFrom === 'input1') {
            results.push({ json: { ...item1 } });
          } else if (outputDataFrom === 'input2') {
            results.push({ json: { ...item2 } });
          }
        }
      }
    }

    // Handle unmatched items based on joinMode
    if (joinMode === 'keepEverything' || joinMode === 'enrichInput1') {
      for (let i = 0; i < input1.length; i++) {
        if (!matched1.has(i)) {
          results.push(input1[i]);
        }
      }
    }

    if (joinMode === 'keepEverything' || joinMode === 'enrichInput2') {
      for (let j = 0; j < input2.length; j++) {
        if (!matched2.has(j)) {
          results.push(input2[j]);
        }
      }
    }

    if (joinMode === 'keepNonMatches') {
      if (outputDataFrom === 'input1' || outputDataFrom === 'both') {
        for (let i = 0; i < input1.length; i++) {
          if (!matched1.has(i)) {
            results.push(input1[i]);
          }
        }
      }
      if (outputDataFrom === 'input2' || outputDataFrom === 'both') {
        for (let j = 0; j < input2.length; j++) {
          if (!matched2.has(j)) {
            results.push(input2[j]);
          }
        }
      }
    }

    return results;
  }

  private mergeCombineByPosition(config: any, inputData: NodeInputItem[]): NodeInputItem[] {
    const midpoint = Math.floor(inputData.length / 2);
    const input1 = inputData.slice(0, midpoint);
    const input2 = inputData.slice(midpoint);

    const includeUnpaired = config.includeUnpaired || false;
    const clashHandling = config.clashHandling || 'preferInput2';

    const results: NodeInputItem[] = [];
    const maxLength = includeUnpaired
      ? Math.max(input1.length, input2.length)
      : Math.min(input1.length, input2.length);

    for (let i = 0; i < maxLength; i++) {
      const item1 = i < input1.length ? (input1[i].json || input1[i]) : {};
      const item2 = i < input2.length ? (input2[i].json || input2[i]) : {};

      const merged = this.mergeObjects(item1, item2, clashHandling);
      results.push({ json: merged });
    }

    return results;
  }

  private mergeCombineAll(config: any, inputData: NodeInputItem[]): NodeInputItem[] {
    const midpoint = Math.floor(inputData.length / 2);
    const input1 = inputData.slice(0, midpoint);
    const input2 = inputData.slice(midpoint);

    if (input1.length === 0 || input2.length === 0) {
      return [];
    }

    const clashHandling = config.clashHandling || 'preferInput2';
    const results: NodeInputItem[] = [];

    for (const item1 of input1) {
      for (const item2 of input2) {
        const json1 = item1.json || item1;
        const json2 = item2.json || item2;
        const merged = this.mergeObjects(json1, json2, clashHandling);
        results.push({ json: merged });
      }
    }

    return results;
  }

  private mergeChooseBranch(config: any, inputData: NodeInputItem[]): NodeInputItem[] {
    const output = config.output || 'specifiedInput';
    const useDataOfInput = config.useDataOfInput || 1;

    if (output === 'empty') {
      return [{ json: {} }];
    }

    const midpoint = Math.floor(inputData.length / 2);

    if (useDataOfInput === 1) {
      return inputData.slice(0, midpoint);
    } else if (useDataOfInput === 2) {
      return inputData.slice(midpoint);
    }

    return inputData;
  }

  private mergeObjects(obj1: any, obj2: any, clashHandling: string): any {
    if (clashHandling === 'preferInput1') {
      return { ...obj2, ...obj1 };
    } else if (clashHandling === 'preferInput2') {
      return { ...obj1, ...obj2 };
    } else if (clashHandling === 'addSuffix') {
      const result: any = {};

      for (const key in obj1) {
        const newKey = obj2.hasOwnProperty(key) ? `${key}_1` : key;
        result[newKey] = obj1[key];
      }

      for (const key in obj2) {
        const newKey = obj1.hasOwnProperty(key) ? `${key}_2` : key;
        result[newKey] = obj2[key];
      }

      return result;
    } else {
      return { ...obj1, ...obj2 };
    }
  }
}
