import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  RawBodyRequest,
  Req,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Request } from 'express';
import { TypeformTriggerService } from './typeform-trigger.service';
import { WorkflowService } from '../../../workflow/workflow.service';

interface TypeformAnswer {
  field: {
    id: string;
    ref: string;
    type: string;
  };
  type: string;
  text?: string;
  number?: number;
  boolean?: boolean;
  email?: string;
  url?: string;
  file_url?: string;
  choice?: {
    label: string;
  };
  choices?: {
    labels: string[];
  };
  date?: string;
}

interface TypeformWebhookPayload {
  event_id: string;
  event_type: 'form_response';
  form_response: {
    form_id: string;
    token: string;
    landed_at: string;
    submitted_at: string;
    definition: {
      id: string;
      title: string;
      fields: Array<{
        id: string;
        ref: string;
        type: string;
        title: string;
      }>;
    };
    answers: TypeformAnswer[];
    hidden?: Record<string, string>;
    calculated?: {
      score?: number;
    };
    variables?: Array<{
      key: string;
      type: string;
      text?: string;
      number?: number;
    }>;
  };
}

@Controller('webhooks/typeform')
export class TypeformWebhookController {
  private readonly logger = new Logger(TypeformWebhookController.name);

  constructor(
    private readonly typeformTriggerService: TypeformTriggerService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: TypeformWebhookPayload,
    @Headers('typeform-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    this.logger.log(`Received Typeform webhook for workflow ${workflowId}`);
    this.logger.debug(`Event type: ${payload.event_type}`);
    this.logger.debug(`Form ID: ${payload.form_response?.form_id}`);

    // Validate signature if provided
    if (signature) {
      const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
      const isValid = this.typeformTriggerService.validateSignature(workflowId, rawBody, signature);

      if (!isValid) {
        this.logger.warn(`Invalid signature for workflow ${workflowId}`);
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    try {
      // Prepare event data
      const eventData = this.prepareEventData(payload);

      // Execute workflow
      await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          typeformEvent: eventData,
        },
      });

      this.logger.log(`Successfully triggered workflow ${workflowId} with Typeform form_response event`);

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to process Typeform webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  private prepareEventData(payload: TypeformWebhookPayload): any {
    const formResponse = payload.form_response;

    // Build a map of field ref/id to answer for easier access
    const answersMap: Record<string, any> = {};
    const answersByTitle: Record<string, any> = {};

    if (formResponse.answers) {
      formResponse.answers.forEach((answer) => {
        const field = formResponse.definition?.fields?.find(
          (f) => f.id === answer.field.id || f.ref === answer.field.ref
        );

        const answerValue = this.extractAnswerValue(answer);

        if (answer.field.ref) {
          answersMap[answer.field.ref] = answerValue;
        }
        if (answer.field.id) {
          answersMap[answer.field.id] = answerValue;
        }
        if (field?.title) {
          answersByTitle[field.title] = answerValue;
        }
      });
    }

    return {
      event_id: payload.event_id,
      event_type: payload.event_type,
      timestamp: new Date().toISOString(),

      // Form information
      form_id: formResponse.form_id,
      form_title: formResponse.definition?.title,

      // Response details
      response_id: formResponse.token,
      landed_at: formResponse.landed_at,
      submitted_at: formResponse.submitted_at,

      // Raw answers array
      answers: formResponse.answers?.map((answer) => ({
        field_id: answer.field.id,
        field_ref: answer.field.ref,
        field_type: answer.field.type,
        answer_type: answer.type,
        value: this.extractAnswerValue(answer),
      })) || [],

      // Processed answers as key-value pairs
      answers_map: answersMap,
      answers_by_title: answersByTitle,

      // Hidden fields
      hidden: formResponse.hidden || {},

      // Calculated values
      calculated: formResponse.calculated || {},

      // Variables
      variables: formResponse.variables?.reduce((acc, v) => {
        acc[v.key] = v.text ?? v.number;
        return acc;
      }, {} as Record<string, any>) || {},

      // Form definition for reference
      fields: formResponse.definition?.fields?.map((field) => ({
        id: field.id,
        ref: field.ref,
        type: field.type,
        title: field.title,
      })) || [],
    };
  }

  private extractAnswerValue(answer: TypeformAnswer): any {
    switch (answer.type) {
      case 'text':
        return answer.text;
      case 'number':
        return answer.number;
      case 'boolean':
        return answer.boolean;
      case 'email':
        return answer.email;
      case 'url':
        return answer.url;
      case 'file_url':
        return answer.file_url;
      case 'choice':
        return answer.choice?.label;
      case 'choices':
        return answer.choices?.labels || [];
      case 'date':
        return answer.date;
      default:
        // Return the entire answer object if type is unknown
        return answer;
    }
  }
}
