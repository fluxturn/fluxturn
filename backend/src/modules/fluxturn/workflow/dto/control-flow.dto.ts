import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// CONDITION DTOs
// ============================================

export enum OperatorType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array'
}

export enum StringOperation {
  EQUALS = 'equals',
  NOT_EQUALS = 'notEquals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  IS_EMPTY = 'isEmpty',
  IS_NOT_EMPTY = 'isNotEmpty',
  REGEX = 'regex'
}

export enum NumberOperation {
  EQUALS = 'equals',
  NOT_EQUALS = 'notEquals',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  IS_EMPTY = 'isEmpty',
  IS_NOT_EMPTY = 'isNotEmpty'
}

export enum BooleanOperation {
  TRUE = 'true',
  FALSE = 'false',
  EQUALS = 'equals'
}

export class ConditionOperatorDto {
  @ApiProperty({
    description: 'Type of the operator',
    enum: OperatorType,
    example: 'string'
  })
  @IsEnum(OperatorType)
  type: OperatorType;

  @ApiProperty({
    description: 'Operation to perform',
    example: 'equals'
  })
  @IsString()
  operation: string;
}

export class ConditionDto {
  @ApiProperty({
    description: 'Left side value or expression',
    example: '{{$json.status}}'
  })
  @IsString()
  leftValue: string;

  @ApiProperty({
    description: 'Operator to apply',
    type: ConditionOperatorDto
  })
  @ValidateNested()
  @Type(() => ConditionOperatorDto)
  operator: ConditionOperatorDto;

  @ApiProperty({
    description: 'Right side value or expression',
    example: 'active'
  })
  @IsString()
  rightValue: string;
}

export class ConditionsConfigDto {
  @ApiProperty({
    description: 'Logical combinator for conditions',
    enum: ['and', 'or'],
    example: 'and'
  })
  @IsEnum(['and', 'or'])
  combinator: 'and' | 'or';

  @ApiProperty({
    description: 'Array of conditions',
    type: [ConditionDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions: ConditionDto[];
}

// ============================================
// IF NODE DTOs
// ============================================

export class IfNodeConfigDto {
  @ApiProperty({
    description: 'Conditions to evaluate',
    type: ConditionsConfigDto
  })
  @ValidateNested()
  @Type(() => ConditionsConfigDto)
  conditions: ConditionsConfigDto;

  @ApiPropertyOptional({
    description: 'Ignore case when comparing strings',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  ignoreCase?: boolean;
}

// ============================================
// FILTER NODE DTOs
// ============================================

export class FilterNodeConfigDto {
  @ApiProperty({
    description: 'Filter conditions',
    type: ConditionsConfigDto
  })
  @ValidateNested()
  @Type(() => ConditionsConfigDto)
  conditions: ConditionsConfigDto;

  @ApiPropertyOptional({
    description: 'Ignore case when comparing strings',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  ignoreCase?: boolean;
}

// ============================================
// SWITCH NODE DTOs
// ============================================

export class SwitchRuleDto {
  @ApiProperty({
    description: 'Conditions for this rule',
    type: ConditionsConfigDto
  })
  @ValidateNested()
  @Type(() => ConditionsConfigDto)
  conditions: ConditionsConfigDto;

  @ApiPropertyOptional({
    description: 'Custom output key/name',
    example: 'high_priority'
  })
  @IsOptional()
  @IsString()
  outputKey?: string;

  @ApiPropertyOptional({
    description: 'Whether to rename the output',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  renameOutput?: boolean;
}

export class SwitchRulesConfigDto {
  @ApiProperty({
    description: 'Array of routing rules',
    type: [SwitchRuleDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SwitchRuleDto)
  values: SwitchRuleDto[];
}

export class SwitchNodeConfigDto {
  @ApiProperty({
    description: 'Switch mode',
    enum: ['rules', 'expression'],
    example: 'rules'
  })
  @IsEnum(['rules', 'expression'])
  mode: 'rules' | 'expression';

  @ApiPropertyOptional({
    description: 'Routing rules (for rules mode)',
    type: SwitchRulesConfigDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SwitchRulesConfigDto)
  rules?: SwitchRulesConfigDto;

  @ApiPropertyOptional({
    description: 'Expression to evaluate (for expression mode)',
    example: 'data.priority'
  })
  @IsOptional()
  @IsString()
  expression?: string;

  @ApiPropertyOptional({
    description: 'Number of outputs (for expression mode)',
    example: 3
  })
  @IsOptional()
  numberOutputs?: number;

  @ApiPropertyOptional({
    description: 'Fallback output handling',
    enum: ['none', 'extra'],
    default: 'none'
  })
  @IsOptional()
  @IsEnum(['none', 'extra'])
  fallbackOutput?: string;

  @ApiPropertyOptional({
    description: 'Ignore case when comparing strings',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  ignoreCase?: boolean;

  @ApiPropertyOptional({
    description: 'Send data to all matching outputs',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  allMatchingOutputs?: boolean;
}

// ============================================
// LOOP NODE DTOs
// ============================================

export class LoopNodeConfigDto {
  @ApiProperty({
    description: 'Expression returning array to iterate over',
    example: '{{$json.items}}'
  })
  @IsString()
  items: string;

  @ApiPropertyOptional({
    description: 'Number of items to process in each batch',
    example: 10
  })
  @IsOptional()
  batchSize?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of iterations',
    example: 100
  })
  @IsOptional()
  maxIterations?: number;
}

// ============================================
// CONTROL FLOW EXECUTION RESULT DTOs
// ============================================

export class IfExecutionResultDto {
  @ApiProperty({
    description: 'True branch output data'
  })
  trueOutput: any[];

  @ApiProperty({
    description: 'False branch output data'
  })
  falseOutput: any[];

  @ApiProperty({
    description: 'Number of items routed to true branch'
  })
  trueCount: number;

  @ApiProperty({
    description: 'Number of items routed to false branch'
  })
  falseCount: number;
}

export class FilterExecutionResultDto {
  @ApiProperty({
    description: 'Items that passed the filter'
  })
  kept: any[];

  @ApiProperty({
    description: 'Items that were filtered out'
  })
  discarded: any[];

  @ApiProperty({
    description: 'Number of items kept'
  })
  keptCount: number;

  @ApiProperty({
    description: 'Number of items discarded'
  })
  discardedCount: number;
}

export class SwitchExecutionResultDto {
  @ApiProperty({
    description: 'Output data for each branch',
    type: 'object'
  })
  outputs: Record<string, any[]>;

  @ApiProperty({
    description: 'Number of items routed to each output'
  })
  routingStats: Record<string, number>;

  @ApiProperty({
    description: 'Number of unmatched items'
  })
  unmatchedCount: number;
}

export class LoopExecutionResultDto {
  @ApiProperty({
    description: 'Results from each iteration'
  })
  iterationResults: any[];

  @ApiProperty({
    description: 'Total number of iterations'
  })
  totalIterations: number;

  @ApiProperty({
    description: 'Number of successful iterations'
  })
  successfulIterations: number;

  @ApiProperty({
    description: 'Number of failed iterations'
  })
  failedIterations: number;
}
