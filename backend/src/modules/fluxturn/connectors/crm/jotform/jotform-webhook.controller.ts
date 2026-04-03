import {
  Controller,
  Post,
  Param,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JotformTriggerService } from './jotform-trigger.service';
import { WorkflowService } from '../../../workflow/workflow.service';

interface JotformWebhookPayload {
  submissionID?: string;
  formID?: string;
  ip?: string;
  created_at?: string;
  status?: string;
  new?: string;
  flag?: string;
  answers?: Record<string, any>;
  rawRequest?: string;
  pretty?: string;
  // Additional fields Jotform may send
  [key: string]: any;
}

@Controller('webhooks/jotform')
export class JotformWebhookController {
  private readonly logger = new Logger(JotformWebhookController.name);

  constructor(
    private readonly jotformTriggerService: JotformTriggerService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: JotformWebhookPayload,
  ) {
    this.logger.log(`Received Jotform webhook for workflow ${workflowId}`);
    this.logger.debug(`Submission ID: ${payload.submissionID}`);
    this.logger.debug(`Form ID: ${payload.formID}`);

    try {
      // Prepare event data
      const eventData = this.prepareEventData(payload);

      // Execute workflow
      await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          jotformEvent: eventData,
        },
      });

      this.logger.log(`Successfully triggered workflow ${workflowId} with Jotform form_submission event`);

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to process Jotform webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  private prepareEventData(payload: JotformWebhookPayload): any {
    // Parse rawRequest if available (contains the full submission data as JSON)
    let parsedData: any = {};
    if (payload.rawRequest) {
      try {
        parsedData = JSON.parse(payload.rawRequest);
      } catch (e) {
        this.logger.debug('Could not parse rawRequest as JSON');
      }
    }

    // Parse pretty if available (contains human-readable form data)
    let prettyData: any = {};
    if (payload.pretty) {
      try {
        prettyData = JSON.parse(payload.pretty);
      } catch (e) {
        this.logger.debug('Could not parse pretty as JSON');
      }
    }

    // Build answers map from the payload
    const answersMap: Record<string, any> = {};
    const answersByName: Record<string, any> = {};

    // Extract answers from various formats Jotform might send
    if (payload.answers) {
      Object.entries(payload.answers).forEach(([key, value]: [string, any]) => {
        answersMap[key] = value?.answer || value;
        if (value?.name) {
          answersByName[value.name] = value?.answer || value;
        }
      });
    }

    // Also try to extract from q fields (q1_fieldname, q2_fieldname, etc.)
    Object.entries(payload).forEach(([key, value]) => {
      if (key.match(/^q\d+_/)) {
        const fieldName = key.replace(/^q\d+_/, '');
        answersByName[fieldName] = value;
        answersMap[key] = value;
      }
    });

    return {
      event_type: 'form_submission',
      timestamp: new Date().toISOString(),

      // Submission information
      submission_id: payload.submissionID,
      form_id: payload.formID,

      // Submitter info
      ip: payload.ip,
      created_at: payload.created_at,
      status: payload.status,
      is_new: payload.new === '1',

      // Raw answers from payload
      answers: payload.answers || {},

      // Processed answers
      answers_map: answersMap,
      answers_by_name: answersByName,

      // Parsed data from rawRequest
      raw_data: parsedData,

      // Pretty formatted data
      pretty_data: prettyData,

      // Full original payload for custom processing
      original_payload: payload,
    };
  }
}
