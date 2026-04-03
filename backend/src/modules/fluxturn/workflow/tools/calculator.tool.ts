import { Logger } from '@nestjs/common';
import {
  ExecutableTool,
  ToolContext,
  ToolResult,
} from '../types/tool.interface';

/**
 * Calculator Tool
 *
 * Tool for AI Agents to perform mathematical calculations.
 * Supports basic arithmetic and common math functions.
 * Does NOT require credentials.
 */
export const CalculatorTool: ExecutableTool = {
  name: 'calculator',
  description:
    'Perform mathematical calculations. Supports basic arithmetic (+, -, *, /, %, ^), parentheses, and functions like sqrt, abs, sin, cos, tan, log, exp, round, floor, ceil. Use this when you need to calculate numbers accurately.',
  category: 'utility',
  requiresCredentials: false,
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description:
          'The mathematical expression to evaluate. Examples: "2 + 2", "sqrt(16)", "10 * (5 + 3)", "sin(3.14159 / 2)"',
      },
    },
    required: ['expression'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('CalculatorTool');

    try {
      logger.log(`Calculator: Evaluating "${params.expression}"`);

      if (!params.expression) {
        return {
          success: false,
          error: 'Expression is required',
        };
      }

      const expression = params.expression.toString().trim();

      // Validate expression - only allow safe characters
      const safePattern = /^[\d\s\+\-\*\/\%\^\(\)\.\,a-zA-Z_]+$/;
      if (!safePattern.test(expression)) {
        return {
          success: false,
          error:
            'Invalid expression. Only numbers, operators (+, -, *, /, %, ^), parentheses, and math functions are allowed.',
        };
      }

      // Safe math evaluation
      const result = evaluateMathExpression(expression);

      if (result === null || isNaN(result) || !isFinite(result)) {
        return {
          success: false,
          error: `Could not evaluate expression: ${expression}`,
        };
      }

      logger.log(`Calculator: ${expression} = ${result}`);

      return {
        success: true,
        data: {
          expression,
          result,
          formattedResult: formatNumber(result),
          message: `${expression} = ${formatNumber(result)}`,
        },
      };
    } catch (error: any) {
      logger.error(`Calculator failed: ${error.message}`);

      return {
        success: false,
        error: `Calculation failed: ${error.message}`,
      };
    }
  },
};

/**
 * Basic Arithmetic Tool - For simple operations
 */
export const BasicArithmeticTool: ExecutableTool = {
  name: 'basic_math',
  description:
    'Perform basic arithmetic operations (add, subtract, multiply, divide) on two numbers. Use this for simple calculations.',
  category: 'utility',
  requiresCredentials: false,
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'The operation to perform',
        enum: ['add', 'subtract', 'multiply', 'divide', 'modulo', 'power'],
      },
      a: {
        type: 'number',
        description: 'The first number',
      },
      b: {
        type: 'number',
        description: 'The second number',
      },
    },
    required: ['operation', 'a', 'b'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('BasicArithmeticTool');

    try {
      const { operation, a, b } = params;

      if (a === undefined || b === undefined) {
        return {
          success: false,
          error: 'Both numbers (a and b) are required',
        };
      }

      const numA = Number(a);
      const numB = Number(b);

      if (isNaN(numA) || isNaN(numB)) {
        return {
          success: false,
          error: 'Invalid numbers provided',
        };
      }

      let result: number;
      let symbol: string;

      switch (operation) {
        case 'add':
          result = numA + numB;
          symbol = '+';
          break;
        case 'subtract':
          result = numA - numB;
          symbol = '-';
          break;
        case 'multiply':
          result = numA * numB;
          symbol = '×';
          break;
        case 'divide':
          if (numB === 0) {
            return {
              success: false,
              error: 'Cannot divide by zero',
            };
          }
          result = numA / numB;
          symbol = '÷';
          break;
        case 'modulo':
          if (numB === 0) {
            return {
              success: false,
              error: 'Cannot modulo by zero',
            };
          }
          result = numA % numB;
          symbol = '%';
          break;
        case 'power':
          result = Math.pow(numA, numB);
          symbol = '^';
          break;
        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}. Use add, subtract, multiply, divide, modulo, or power.`,
          };
      }

      logger.log(`Basic Math: ${numA} ${symbol} ${numB} = ${result}`);

      return {
        success: true,
        data: {
          operation,
          a: numA,
          b: numB,
          result,
          expression: `${numA} ${symbol} ${numB}`,
          message: `${numA} ${symbol} ${numB} = ${formatNumber(result)}`,
        },
      };
    } catch (error: any) {
      logger.error(`Basic Math failed: ${error.message}`);

      return {
        success: false,
        error: `Calculation failed: ${error.message}`,
      };
    }
  },
};

/**
 * Unit Converter Tool
 */
export const UnitConverterTool: ExecutableTool = {
  name: 'unit_converter',
  description:
    'Convert values between common units. Supports length, weight, temperature, and time conversions.',
  category: 'utility',
  requiresCredentials: false,
  parameters: {
    type: 'object',
    properties: {
      value: {
        type: 'number',
        description: 'The value to convert',
      },
      fromUnit: {
        type: 'string',
        description:
          'The unit to convert from. Examples: km, m, cm, mm, mi, ft, in, kg, g, lb, oz, celsius, fahrenheit, kelvin, seconds, minutes, hours, days',
      },
      toUnit: {
        type: 'string',
        description: 'The unit to convert to',
      },
    },
    required: ['value', 'fromUnit', 'toUnit'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('UnitConverterTool');

    try {
      const { value, fromUnit, toUnit } = params;

      if (value === undefined) {
        return {
          success: false,
          error: 'Value is required',
        };
      }

      const numValue = Number(value);
      if (isNaN(numValue)) {
        return {
          success: false,
          error: 'Invalid numeric value',
        };
      }

      const from = fromUnit.toLowerCase().trim();
      const to = toUnit.toLowerCase().trim();

      // Length conversions (base: meters)
      const lengthUnits: Record<string, number> = {
        km: 1000,
        kilometer: 1000,
        kilometers: 1000,
        m: 1,
        meter: 1,
        meters: 1,
        cm: 0.01,
        centimeter: 0.01,
        centimeters: 0.01,
        mm: 0.001,
        millimeter: 0.001,
        millimeters: 0.001,
        mi: 1609.344,
        mile: 1609.344,
        miles: 1609.344,
        ft: 0.3048,
        foot: 0.3048,
        feet: 0.3048,
        in: 0.0254,
        inch: 0.0254,
        inches: 0.0254,
        yd: 0.9144,
        yard: 0.9144,
        yards: 0.9144,
      };

      // Weight conversions (base: grams)
      const weightUnits: Record<string, number> = {
        kg: 1000,
        kilogram: 1000,
        kilograms: 1000,
        g: 1,
        gram: 1,
        grams: 1,
        mg: 0.001,
        milligram: 0.001,
        milligrams: 0.001,
        lb: 453.592,
        pound: 453.592,
        pounds: 453.592,
        oz: 28.3495,
        ounce: 28.3495,
        ounces: 28.3495,
        ton: 907185,
        tons: 907185,
        tonne: 1000000,
        tonnes: 1000000,
      };

      // Time conversions (base: seconds)
      const timeUnits: Record<string, number> = {
        ms: 0.001,
        millisecond: 0.001,
        milliseconds: 0.001,
        s: 1,
        sec: 1,
        second: 1,
        seconds: 1,
        min: 60,
        minute: 60,
        minutes: 60,
        h: 3600,
        hr: 3600,
        hour: 3600,
        hours: 3600,
        d: 86400,
        day: 86400,
        days: 86400,
        week: 604800,
        weeks: 604800,
        month: 2592000, // 30 days
        months: 2592000,
        year: 31536000, // 365 days
        years: 31536000,
      };

      // Temperature conversions
      const tempUnits = ['c', 'celsius', 'f', 'fahrenheit', 'k', 'kelvin'];

      let result: number;
      let category: string;

      // Check if length conversion
      if (lengthUnits[from] && lengthUnits[to]) {
        const meters = numValue * lengthUnits[from];
        result = meters / lengthUnits[to];
        category = 'length';
      }
      // Check if weight conversion
      else if (weightUnits[from] && weightUnits[to]) {
        const grams = numValue * weightUnits[from];
        result = grams / weightUnits[to];
        category = 'weight';
      }
      // Check if time conversion
      else if (timeUnits[from] && timeUnits[to]) {
        const seconds = numValue * timeUnits[from];
        result = seconds / timeUnits[to];
        category = 'time';
      }
      // Check if temperature conversion
      else if (tempUnits.includes(from) && tempUnits.includes(to)) {
        result = convertTemperature(numValue, from, to);
        category = 'temperature';
      } else {
        return {
          success: false,
          error: `Cannot convert between ${fromUnit} and ${toUnit}. Make sure both units are of the same type (length, weight, time, or temperature).`,
        };
      }

      logger.log(`Unit Converter: ${numValue} ${fromUnit} = ${result} ${toUnit}`);

      return {
        success: true,
        data: {
          value: numValue,
          fromUnit,
          toUnit,
          result,
          category,
          message: `${numValue} ${fromUnit} = ${formatNumber(result)} ${toUnit}`,
        },
      };
    } catch (error: any) {
      logger.error(`Unit Converter failed: ${error.message}`);

      return {
        success: false,
        error: `Conversion failed: ${error.message}`,
      };
    }
  },
};

/**
 * Safe math expression evaluator
 */
function evaluateMathExpression(expression: string): number | null {
  try {
    // Replace common math function names with Math equivalents
    let safeExpr = expression
      .replace(/\^/g, '**') // Power operator
      .replace(/sqrt\(/gi, 'Math.sqrt(')
      .replace(/abs\(/gi, 'Math.abs(')
      .replace(/sin\(/gi, 'Math.sin(')
      .replace(/cos\(/gi, 'Math.cos(')
      .replace(/tan\(/gi, 'Math.tan(')
      .replace(/asin\(/gi, 'Math.asin(')
      .replace(/acos\(/gi, 'Math.acos(')
      .replace(/atan\(/gi, 'Math.atan(')
      .replace(/log\(/gi, 'Math.log(')
      .replace(/log10\(/gi, 'Math.log10(')
      .replace(/log2\(/gi, 'Math.log2(')
      .replace(/exp\(/gi, 'Math.exp(')
      .replace(/round\(/gi, 'Math.round(')
      .replace(/floor\(/gi, 'Math.floor(')
      .replace(/ceil\(/gi, 'Math.ceil(')
      .replace(/min\(/gi, 'Math.min(')
      .replace(/max\(/gi, 'Math.max(')
      .replace(/pow\(/gi, 'Math.pow(')
      .replace(/pi/gi, 'Math.PI')
      .replace(/e(?![a-zA-Z])/gi, 'Math.E');

    // Final safety check - only allow Math operations
    if (/[a-zA-Z_]/.test(safeExpr.replace(/Math\.[a-zA-Z]+/g, ''))) {
      return null;
    }

    // Evaluate using Function (safer than eval for math)
    const fn = new Function(`return ${safeExpr}`);
    return fn();
  } catch {
    return null;
  }
}

/**
 * Temperature conversion helper
 */
function convertTemperature(value: number, from: string, to: string): number {
  // Normalize unit names
  const fromNorm = from.toLowerCase().charAt(0);
  const toNorm = to.toLowerCase().charAt(0);

  // Convert to Celsius first
  let celsius: number;
  switch (fromNorm) {
    case 'c':
      celsius = value;
      break;
    case 'f':
      celsius = (value - 32) * (5 / 9);
      break;
    case 'k':
      celsius = value - 273.15;
      break;
    default:
      throw new Error(`Unknown temperature unit: ${from}`);
  }

  // Convert from Celsius to target
  switch (toNorm) {
    case 'c':
      return celsius;
    case 'f':
      return celsius * (9 / 5) + 32;
    case 'k':
      return celsius + 273.15;
    default:
      throw new Error(`Unknown temperature unit: ${to}`);
  }
}

/**
 * Format number for display
 */
function formatNumber(num: number): string {
  if (Number.isInteger(num)) {
    return num.toString();
  }
  // Round to reasonable precision
  const formatted = num.toPrecision(10);
  return parseFloat(formatted).toString();
}

/**
 * Get all Calculator tools
 */
export function getCalculatorTools(): ExecutableTool[] {
  return [CalculatorTool, BasicArithmeticTool, UnitConverterTool];
}
