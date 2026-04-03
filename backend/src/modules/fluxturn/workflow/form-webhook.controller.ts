import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';

@ApiTags('public-forms')
@Controller('public/forms')
export class FormWebhookController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post(':workflowId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit a public form to trigger a workflow',
    description: 'Public endpoint for form submissions - does not require authentication'
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID to trigger' })
  @ApiResponse({
    status: 200,
    description: 'Form submitted and workflow triggered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        executionId: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Invalid form data or workflow not configured for forms' })
  async submitForm(
    @Param('workflowId') workflowId: string,
    @Body() formData: Record<string, any>,
  ) {
    try {
      // Get the workflow to validate it exists and has a form trigger
      const workflow = await this.workflowService.getWorkflow(workflowId);

      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      // Check if workflow has a FORM_TRIGGER node
      const hasFormTrigger = workflow.canvas?.nodes?.some(
        (node: any) => node.type === 'FORM_TRIGGER'
      );

      if (!hasFormTrigger) {
        throw new BadRequestException('This workflow is not configured to accept form submissions');
      }

      // Execute the workflow with form data as input
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          formSubmission: formData,
          submittedAt: new Date().toISOString(),
        },
      });

      return {
        success: true,
        message: 'Form submitted successfully',
        executionId: result.id,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to submit form: ${error.message}`);
    }
  }

  @Post(':workflowId/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate form data before submission',
    description: 'Check if the form data matches the expected fields'
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID to validate against' })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
        formConfig: { type: 'object' }
      }
    }
  })
  async validateForm(
    @Param('workflowId') workflowId: string,
    @Body() formData: Record<string, any>,
  ) {
    try {
      const workflow = await this.workflowService.getWorkflow(workflowId);

      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      // Find the FORM_TRIGGER node
      const formTriggerNode = workflow.canvas?.nodes?.find(
        (node: any) => node.type === 'FORM_TRIGGER'
      );

      if (!formTriggerNode) {
        throw new BadRequestException('This workflow is not configured to accept form submissions');
      }

      const formFields = formTriggerNode.data?.formFields || [];
      const errors: string[] = [];

      // Validate required fields
      formFields.forEach((field: any) => {
        if (field.required && (!formData[field.name] || formData[field.name] === '')) {
          errors.push(`Field "${field.label}" is required`);
        }

        // Basic email validation
        if (field.type === 'email' && formData[field.name]) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formData[field.name])) {
            errors.push(`Field "${field.label}" must be a valid email address`);
          }
        }

        // Number validation
        if (field.type === 'number' && formData[field.name] !== undefined) {
          if (isNaN(Number(formData[field.name]))) {
            errors.push(`Field "${field.label}" must be a number`);
          }
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        formConfig: {
          title: formTriggerNode.data?.formTitle,
          description: formTriggerNode.data?.formDescription,
          fields: formFields,
          submitButtonText: formTriggerNode.data?.submitButtonText,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to validate form: ${error.message}`);
    }
  }
}
