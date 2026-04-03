import { Injectable, Logger } from '@nestjs/common';
import {
  ConditionsConfigDto,
  IfNodeConfigDto,
  FilterNodeConfigDto,
  SwitchNodeConfigDto,
  LoopNodeConfigDto,
  IfExecutionResultDto,
  FilterExecutionResultDto,
  SwitchExecutionResultDto,
  LoopExecutionResultDto,
} from '../dto/control-flow.dto';

@Injectable()
export class ControlFlowService {
  private readonly logger = new Logger(ControlFlowService.name);

  /**
   * Evaluate a single condition against data
   */
  private evaluateCondition(
    condition: any,
    data: any,
    ignoreCase: boolean = true,
  ): boolean {
    const { leftValue, operator, rightValue } = condition;

    // Resolve left value as field reference (auto-resolve)
    const resolvedLeft = this.resolveFieldReference(leftValue, data);
    // Resolve right value as comparison value (literal unless explicitly marked)
    const resolvedRight = this.resolveComparisonValue(rightValue, data);

    // Debug logging for troubleshooting
    this.logger.debug(`[Condition Debug] Data keys: ${Object.keys(data || {}).join(', ')}`);
    this.logger.debug(`[Condition Debug] Field "${leftValue}" resolved to: ${JSON.stringify(resolvedLeft)} (type: ${typeof resolvedLeft})`);
    this.logger.debug(`[Condition Debug] Value "${rightValue}" resolved to: ${JSON.stringify(resolvedRight)} (type: ${typeof resolvedRight})`);

    this.logger.log(
      `Condition: "${leftValue}" ${operator.operation} "${rightValue}" => ` +
      `"${resolvedLeft}" ${operator.operation} "${resolvedRight}"`
    );

    // Apply operator
    const { type, operation } = operator;

    // Route numeric operators to number evaluation even if type is "string"
    const numericOperations = ['gt', 'gte', 'lt', 'lte'];
    const effectiveType = numericOperations.includes(operation) ? 'number' : type;

    let result = false;
    switch (effectiveType) {
      case 'string':
        result = this.evaluateStringOperation(
          resolvedLeft,
          resolvedRight,
          operation,
          ignoreCase,
        );
        break;
      case 'number':
        result = this.evaluateNumberOperation(
          resolvedLeft,
          resolvedRight,
          operation,
        );
        break;
      case 'boolean':
        result = this.evaluateBooleanOperation(
          resolvedLeft,
          resolvedRight,
          operation,
        );
        break;
      case 'date':
        result = this.evaluateDateOperation(
          resolvedLeft,
          resolvedRight,
          operation,
        );
        break;
      case 'array':
        result = this.evaluateArrayOperation(
          resolvedLeft,
          resolvedRight,
          operation,
        );
        break;
      default:
        this.logger.warn(`Unknown operator type: ${type}`);
        result = false;
    }

    this.logger.log(`Condition result: ${result}`);
    return result;
  }

  /**
   * Resolve expression or return literal value
   */
  private resolveExpression(expression: string, data: any): any {
    if (!expression) return expression;

    // Convert to string if not already
    const expr = String(expression).trim();

    // Handle {{expression}} syntax
    if (expr.startsWith('{{') && expr.endsWith('}}')) {
      const path = expr.slice(2, -2).trim();

      // Remove $json. or $json prefix (with or without space)
      let cleanPath = path.replace(/^\$json\s*\.?\s*/, '');

      // Also handle bracket notation: $json["field"]
      cleanPath = cleanPath.replace(/^\["(.+?)"\]/, '$1');

      // Navigate the object path
      const value = this.getNestedValue(data, cleanPath);

      // Log for debugging
      this.logger.debug(`Resolved expression "${expr}" with path "${cleanPath}" to value: ${JSON.stringify(value)}`);

      return value;
    }

    // Handle data.field syntax (without curly braces)
    if (expr.startsWith('data.')) {
      const path = expr.slice(5);
      return this.getNestedValue(data, path);
    }

    // Check if it's a literal value (number, boolean, quoted string)
    // Numbers: "123", "45.67", "-10"
    if (/^-?\d+\.?\d*$/.test(expr)) {
      return Number(expr);
    }

    // Booleans: "true", "false"
    if (expr === 'true') return true;
    if (expr === 'false') return false;

    // Quoted strings: "'value'" or '"value"'
    if ((expr.startsWith("'") && expr.endsWith("'")) ||
        (expr.startsWith('"') && expr.endsWith('"'))) {
      return expr.slice(1, -1);
    }

    // Check if it looks like a field path (contains dots or is a simple identifier)
    // Examples: "user.name", "email", "status", "items[0]"
    // NOT: "hello world", "some text"
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*|\[\d+\])*$/.test(expr)) {
      // Treat as field reference - navigate the object path
      const value = this.getNestedValue(data, expr);
      this.logger.debug(`Resolved field reference "${expr}" to value: ${JSON.stringify(value)}`);
      return value;
    }

    // Return as literal string for anything else
    return expr;
  }

  /**
   * Resolve field reference (left side of condition)
   * Always treats value as field path, with auto-resolution
   */
  private resolveFieldReference(expression: string, data: any): any {
    if (!expression) return expression;

    const expr = String(expression).trim();

    // Handle {{expression}} syntax
    if (expr.startsWith('{{') && expr.endsWith('}}')) {
      const path = expr.slice(2, -2).trim();

      // Remove $json. or $json prefix
      let cleanPath = path.replace(/^\$json\s*\.?\s*/, '');

      // Handle $node["NodeName"].json.field pattern - extract just the field name
      // Pattern: $node["Run Code"].json.tw_img -> tw_img
      const nodeJsonMatch = cleanPath.match(/^\$node\s*\[\s*["']([^"']+)["']\s*\]\s*\.?\s*json\s*\.?\s*(.*)$/);
      if (nodeJsonMatch) {
        cleanPath = nodeJsonMatch[2]; // Get the field path after .json.
        this.logger.debug(`Extracted field from node reference: "${cleanPath}"`);
      }

      // Strip out array index patterns like "0[0].json." or "0.json." that come from nested output structure
      // Pattern: 0[0].json.telegramEvent -> telegramEvent
      // Pattern: 0.json.telegramEvent -> telegramEvent
      cleanPath = cleanPath.replace(/^\d+(\[\d+\])?\.json\./, '');

      // Also handle bracket notation: $json["field"]
      cleanPath = cleanPath.replace(/^\["(.+?)"\]/, '$1');

      const value = this.getNestedValue(data, cleanPath);
      this.logger.debug(`Resolved field reference "${expr}" with path "${cleanPath}" to value: ${JSON.stringify(value)}`);
      return value;
    }

    // Handle data.field syntax
    if (expr.startsWith('data.')) {
      const path = expr.slice(5);
      return this.getNestedValue(data, path);
    }

    // Treat as field path (auto-resolve)
    const value = this.getNestedValue(data, expr);
    this.logger.debug(`Resolved field reference "${expr}" to value: ${JSON.stringify(value)}`);
    return value;
  }

  /**
   * Resolve comparison value (right side of condition)
   * Treats as literal unless explicitly marked with {{}} or data. prefix
   */
  private resolveComparisonValue(expression: string, data: any): any {
    if (!expression) return expression;

    const expr = String(expression).trim();

    // Handle {{expression}} syntax - explicit field reference
    if (expr.startsWith('{{') && expr.endsWith('}}')) {
      const path = expr.slice(2, -2).trim();
      const cleanPath = path.replace(/^\$json\s*\.?\s*/, '');
      const value = this.getNestedValue(data, cleanPath);
      this.logger.debug(`Resolved comparison value "${expr}" to field value: ${JSON.stringify(value)}`);
      return value;
    }

    // Handle data.field syntax - explicit field reference
    if (expr.startsWith('data.')) {
      const path = expr.slice(5);
      return this.getNestedValue(data, path);
    }

    // Check if it's a literal value (number, boolean, quoted string)
    // Numbers: "123", "45.67", "-10"
    if (/^-?\d+\.?\d*$/.test(expr)) {
      return Number(expr);
    }

    // Booleans: "true", "false"
    if (expr === 'true') return true;
    if (expr === 'false') return false;

    // Quoted strings: "'value'" or '"value"' - remove quotes
    if ((expr.startsWith("'") && expr.endsWith("'")) ||
        (expr.startsWith('"') && expr.endsWith('"'))) {
      return expr.slice(1, -1);
    }

    // Everything else is treated as literal string
    this.logger.debug(`Resolved comparison value "${expr}" to literal: "${expr}"`);
    return expr;
  }

  /**
   * Get nested value from object by path
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) return obj;

    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Evaluate string operations
   */
  private evaluateStringOperation(
    left: any,
    right: any,
    operation: string,
    ignoreCase: boolean,
  ): boolean {
    const leftStr = String(left ?? '');
    const rightStr = String(right ?? '');

    const l = ignoreCase ? leftStr.toLowerCase() : leftStr;
    const r = ignoreCase ? rightStr.toLowerCase() : rightStr;

    switch (operation) {
      case 'equals':
        return l === r;
      case 'notEquals':
        return l !== r;
      case 'contains':
        return l.includes(r);
      case 'notContains':
        return !l.includes(r);
      case 'startsWith':
        return l.startsWith(r);
      case 'endsWith':
        return l.endsWith(r);
      case 'isEmpty':
        return leftStr === '';
      case 'isNotEmpty':
        return leftStr !== '';
      case 'regex':
        try {
          const regex = new RegExp(rightStr, ignoreCase ? 'i' : '');
          return regex.test(leftStr);
        } catch (e) {
          this.logger.warn(`Invalid regex: ${rightStr}`);
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Evaluate number operations
   */
  private evaluateNumberOperation(
    left: any,
    right: any,
    operation: string,
  ): boolean {
    const leftNum = Number(left);
    const rightNum = Number(right);

    if (isNaN(leftNum) && operation !== 'isEmpty' && operation !== 'isNotEmpty') {
      return false;
    }

    switch (operation) {
      case 'equals':
        return leftNum === rightNum;
      case 'notEquals':
        return leftNum !== rightNum;
      case 'gt':
        return leftNum > rightNum;
      case 'gte':
        return leftNum >= rightNum;
      case 'lt':
        return leftNum < rightNum;
      case 'lte':
        return leftNum <= rightNum;
      case 'isEmpty':
        return left === null || left === undefined || left === '';
      case 'isNotEmpty':
        return left !== null && left !== undefined && left !== '';
      default:
        return false;
    }
  }

  /**
   * Evaluate boolean operations
   */
  private evaluateBooleanOperation(
    left: any,
    right: any,
    operation: string,
  ): boolean {
    const leftBool = Boolean(left);
    const rightBool = Boolean(right);

    switch (operation) {
      case 'true':
        return leftBool === true;
      case 'false':
        return leftBool === false;
      case 'equals':
        return leftBool === rightBool;
      default:
        return false;
    }
  }

  /**
   * Evaluate date operations
   */
  private evaluateDateOperation(
    left: any,
    right: any,
    operation: string,
  ): boolean {
    const leftDate = new Date(left);
    const rightDate = new Date(right);

    if (isNaN(leftDate.getTime()) || isNaN(rightDate.getTime())) {
      return false;
    }

    switch (operation) {
      case 'equals':
        return leftDate.getTime() === rightDate.getTime();
      case 'notEquals':
        return leftDate.getTime() !== rightDate.getTime();
      case 'after':
        return leftDate.getTime() > rightDate.getTime();
      case 'before':
        return leftDate.getTime() < rightDate.getTime();
      default:
        return false;
    }
  }

  /**
   * Evaluate array operations
   */
  private evaluateArrayOperation(
    left: any,
    right: any,
    operation: string,
  ): boolean {
    if (!Array.isArray(left)) {
      return false;
    }

    switch (operation) {
      case 'contains':
        return left.includes(right);
      case 'notContains':
        return !left.includes(right);
      case 'isEmpty':
        return left.length === 0;
      case 'isNotEmpty':
        return left.length > 0;
      case 'lengthEquals':
        return left.length === Number(right);
      default:
        return false;
    }
  }

  /**
   * Evaluate multiple conditions with combinator
   */
  private evaluateConditions(
    conditionsConfig: ConditionsConfigDto,
    data: any,
    ignoreCase: boolean = true,
  ): boolean {
    const { combinator, conditions } = conditionsConfig;

    if (!conditions || conditions.length === 0) {
      return true;
    }

    const results = conditions.map((condition) =>
      this.evaluateCondition(condition, data, ignoreCase),
    );

    if (combinator === 'and') {
      return results.every((result) => result === true);
    } else {
      // 'or'
      return results.some((result) => result === true);
    }
  }

  /**
   * Execute IF node
   */
  async executeIfNode(
    config: IfNodeConfigDto,
    inputData: any[],
  ): Promise<IfExecutionResultDto> {
    this.logger.log(`IF Node - Evaluating ${inputData.length} items`);
    this.logger.log(`IF Node - Conditions: ${JSON.stringify(config.conditions)}`);
    this.logger.log(`IF Node - Input data sample: ${JSON.stringify(inputData[0])}`);

    const trueOutput: any[] = [];
    const falseOutput: any[] = [];

    for (const item of inputData) {
      const passed = this.evaluateConditions(
        config.conditions,
        item,
        config.ignoreCase ?? true,
      );

      this.logger.log(`IF Node - Item evaluation result: ${passed}, Data: ${JSON.stringify(item).substring(0, 100)}`);

      if (passed) {
        trueOutput.push(item);
      } else {
        falseOutput.push(item);
      }
    }

    this.logger.log(`IF Node - True output: ${trueOutput.length}, False output: ${falseOutput.length}`);

    return {
      trueOutput,
      falseOutput,
      trueCount: trueOutput.length,
      falseCount: falseOutput.length,
    };
  }

  /**
   * Execute FILTER node
   */
  async executeFilterNode(
    config: FilterNodeConfigDto,
    inputData: any[],
  ): Promise<FilterExecutionResultDto> {
    const kept: any[] = [];
    const discarded: any[] = [];

    for (const item of inputData) {
      const passed = this.evaluateConditions(
        config.conditions,
        item,
        config.ignoreCase ?? true,
      );

      if (passed) {
        kept.push(item);
      } else {
        discarded.push(item);
      }
    }

    return {
      kept,
      discarded,
      keptCount: kept.length,
      discardedCount: discarded.length,
    };
  }

  /**
   * Execute SWITCH node
   */
  async executeSwitchNode(
    config: SwitchNodeConfigDto,
    inputData: any[],
  ): Promise<SwitchExecutionResultDto> {
    const outputs: Record<string, any[]> = {};
    const routingStats: Record<string, number> = {};
    let unmatchedCount = 0;

    if (config.mode === 'rules' && config.rules) {
      // Initialize outputs for each rule
      config.rules.values.forEach((rule, index) => {
        const outputKey = rule.renameOutput && rule.outputKey
          ? rule.outputKey
          : index.toString();
        outputs[outputKey] = [];
        routingStats[outputKey] = 0;
      });

      // Add fallback output if needed
      if (config.fallbackOutput === 'extra') {
        outputs['fallback'] = [];
        routingStats['fallback'] = 0;
      }

      // Route each item
      for (const item of inputData) {
        let matched = false;

        for (let i = 0; i < config.rules.values.length; i++) {
          const rule = config.rules.values[i];
          const passed = this.evaluateConditions(
            rule.conditions,
            item,
            config.ignoreCase ?? true,
          );

          if (passed) {
            const outputKey = rule.renameOutput && rule.outputKey
              ? rule.outputKey
              : i.toString();
            outputs[outputKey].push(item);
            routingStats[outputKey]++;
            matched = true;

            // Break unless allMatchingOutputs is enabled
            if (!config.allMatchingOutputs) {
              break;
            }
          }
        }

        // Handle unmatched items
        if (!matched) {
          if (config.fallbackOutput === 'extra') {
            outputs['fallback'].push(item);
            routingStats['fallback']++;
          } else {
            unmatchedCount++;
          }
        }
      }
    } else if (config.mode === 'expression') {
      // Expression mode - evaluate expression to get output index
      const numOutputs = config.numberOutputs || 2;

      // Initialize outputs
      for (let i = 0; i < numOutputs; i++) {
        outputs[i.toString()] = [];
        routingStats[i.toString()] = 0;
      }

      for (const item of inputData) {
        try {
          const outputIndex = this.resolveExpression(config.expression || '0', item);
          const indexStr = String(outputIndex);

          if (outputs[indexStr]) {
            outputs[indexStr].push(item);
            routingStats[indexStr]++;
          } else {
            unmatchedCount++;
          }
        } catch (error) {
          this.logger.error(`Error evaluating switch expression: ${error.message}`);
          unmatchedCount++;
        }
      }
    }

    return {
      outputs,
      routingStats,
      unmatchedCount,
    };
  }

  /**
   * Execute LOOP node
   */
  async executeLoopNode(
    config: LoopNodeConfigDto,
    inputData: any,
    iterationCallback: (item: any, index: number) => Promise<any>,
  ): Promise<LoopExecutionResultDto> {
    const itemsExpression = config.items;
    const items = this.resolveExpression(itemsExpression, inputData);

    if (!Array.isArray(items)) {
      throw new Error(`Loop items expression did not return an array: ${itemsExpression}`);
    }

    const maxIterations = config.maxIterations || items.length;
    const itemsToProcess = items.slice(0, maxIterations);

    const iterationResults: any[] = [];
    let successfulIterations = 0;
    let failedIterations = 0;

    // Process items in batches if batchSize is specified
    const batchSize = config.batchSize || itemsToProcess.length;

    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
      const batch = itemsToProcess.slice(i, i + batchSize);

      const batchPromises = batch.map(async (item, batchIndex) => {
        const index = i + batchIndex;
        try {
          const result = await iterationCallback(item, index);
          successfulIterations++;
          return { success: true, index, item, result };
        } catch (error) {
          failedIterations++;
          this.logger.error(`Loop iteration ${index} failed: ${error.message}`);
          return { success: false, index, item, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      iterationResults.push(...batchResults);
    }

    return {
      iterationResults,
      totalIterations: itemsToProcess.length,
      successfulIterations,
      failedIterations,
    };
  }
}
