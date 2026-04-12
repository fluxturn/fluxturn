import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum WorkflowFormat {
  YAML = 'yaml',
  JSON = 'json',
}

export class ImportWorkflowDto {
  @ApiProperty({
    description: 'Format of the workflow definition',
    enum: WorkflowFormat,
    example: 'yaml',
  })
  @IsEnum(WorkflowFormat)
  format: WorkflowFormat;

  @ApiProperty({
    description: 'Workflow definition string in the specified format',
    example: 'version: "1.0"\nname: My Workflow\nnodes: []\nedges: []',
  })
  @IsString()
  definition: string;
}
