import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Set (Edit Fields) Executor
 * Add, modify, or remove fields from data
 */
@Injectable()
export class SetExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['SET'];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const results: NodeInputItem[] = [];

    const mode = config.mode || 'manual';
    const includeOtherFields = config.includeOtherFields !== false;
    const include = config.include || 'all';
    const includeFields = config.includeFields?.split(',').map((f: string) => f.trim()) || [];
    const excludeFields = config.excludeFields?.split(',').map((f: string) => f.trim()) || [];
    const dotNotation = config.dotNotation !== false;
    const ignoreConversionErrors = config.ignoreConversionErrors !== false;

    for (const item of inputData) {
      const itemContext = this.buildItemContext(item, context);
      const inputJson = item.json || item;

      let outputJson: any = {};

      // Handle includeOtherFields
      if (includeOtherFields) {
        if (include === 'all') {
          outputJson = { ...inputJson };
        } else if (include === 'selected' && includeFields.length > 0) {
          for (const field of includeFields) {
            if (inputJson[field] !== undefined) {
              outputJson[field] = inputJson[field];
            }
          }
        } else if (include === 'except' && excludeFields.length > 0) {
          outputJson = { ...inputJson };
          for (const field of excludeFields) {
            delete outputJson[field];
          }
        }
      }

      if (mode === 'manual' && config.fields) {
        // Manual field definitions
        for (const field of config.fields) {
          const fieldName = field.name;
          let fieldValue = field.value;

          // Resolve expression if string
          if (typeof fieldValue === 'string') {
            try {
              fieldValue = this.resolveExpression(fieldValue, itemContext);
            } catch (e: any) {
              if (!ignoreConversionErrors) {
                throw new Error(`Failed to resolve expression for field "${fieldName}": ${e.message}`);
              }
            }
          }

          // Type conversion
          if (field.type) {
            try {
              fieldValue = this.convertType(fieldValue, field.type);
            } catch (e: any) {
              if (!ignoreConversionErrors) {
                throw new Error(`Type conversion failed for field "${fieldName}": ${e.message}`);
              }
            }
          }

          // Set the field (with dot notation support)
          if (dotNotation && fieldName.includes('.')) {
            this.setNestedValue(outputJson, fieldName, fieldValue);
          } else {
            outputJson[fieldName] = fieldValue;
          }
        }
      } else if (mode === 'json' && config.jsonOutput) {
        // Direct JSON output
        try {
          const jsonString = this.resolveExpression(config.jsonOutput, itemContext);
          const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
          outputJson = includeOtherFields ? { ...outputJson, ...parsed } : parsed;
        } catch (e: any) {
          throw new Error(`Failed to parse JSON output: ${e.message}`);
        }
      }

      results.push({ json: outputJson });
    }

    return results;
  }

  private convertType(value: any, type: string): any {
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        const num = Number(value);
        if (isNaN(num)) throw new Error(`Cannot convert "${value}" to number`);
        return num;
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (value === 'true' || value === '1') return true;
        if (value === 'false' || value === '0') return false;
        return Boolean(value);
      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return [value];
          }
        }
        return [value];
      case 'object':
        if (typeof value === 'object' && value !== null) return value;
        if (typeof value === 'string') {
          return JSON.parse(value);
        }
        throw new Error(`Cannot convert "${value}" to object`);
      default:
        return value;
    }
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }
}
