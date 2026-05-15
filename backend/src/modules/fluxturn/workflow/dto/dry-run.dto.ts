import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DryRunDto {
  @ApiPropertyOptional({
    description: 'Sample input data to use during the dry run',
    example: { email: 'test@example.com', name: 'John Doe' },
  })
  @IsOptional()
  @IsObject()
  sampleInput?: Record<string, any>;
}

export interface DryRunStepResult {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  configValid: boolean;
  credentialsAvailable: boolean;
  wouldExecute: string;
  mockOutput: any;
  errors?: string[];
  warnings?: string[];
}

export interface DryRunResult {
  workflowId: string;
  steps: DryRunStepResult[];
  errors: string[];
  warnings: string[];
  totalNodes: number;
  executionOrder: string[];
}
