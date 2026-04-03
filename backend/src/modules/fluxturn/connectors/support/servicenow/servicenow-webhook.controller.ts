import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Inject,
  forwardRef,
  Logger,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { ServiceNowTriggerService } from './servicenow-trigger.service';

interface ServiceNowWebhookPayload {
  event: string;
  timestamp: string;
  record: {
    sys_id: string;
    number: string;
    short_description?: string;
    description?: string;
    state?: string;
    priority?: string;
    urgency?: string;
    impact?: string;
    assigned_to?: string;
    caller_id?: string;
    category?: string;
    subcategory?: string;
    created_on?: string;
    updated_on?: string;
    [key: string]: any;
  };
}

@ApiTags('ServiceNow Webhook')
@Controller('webhooks/servicenow')
export class ServiceNowWebhookController {
  private readonly logger = new Logger(ServiceNowWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly servicenowTriggerService: ServiceNowTriggerService
  ) {}

  @Post(':workflowId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle ServiceNow webhook' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: ServiceNowWebhookPayload,
    @Headers('x-servicenow-secret') secretToken: string
  ) {
    this.logger.log(`Received ServiceNow webhook for workflow ${workflowId}`);
    this.logger.debug(`Event type: ${payload.event}`);

    try {
      // Get workflow data
      const workflowData = await this.workflowService.getWorkflow(workflowId);

      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { success: false, message: 'Workflow not found' };
      }

      // Verify secret token
      if (secretToken) {
        const isValid = this.servicenowTriggerService.verifySecretToken(workflowId, secretToken);
        if (!isValid) {
          this.logger.warn(`Invalid secret token for workflow ${workflowId}`);
          throw new UnauthorizedException('Invalid webhook secret token');
        }
      }

      // Find matching trigger node
      const canvas = workflowData.canvas;
      const nodes = canvas?.nodes || [];

      const triggerNodes = nodes.filter(
        (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                      node.data?.connectorType === 'servicenow'
      );

      if (triggerNodes.length === 0) {
        this.logger.warn(`No ServiceNow trigger node found in workflow ${workflowId}`);
        return { success: false, message: 'No ServiceNow trigger configured' };
      }

      // Check if event matches trigger
      const matchingTrigger = triggerNodes.find((node: any) => {
        const triggerId = node.data?.triggerId || node.data?.actionParams?.triggerId;
        return this.eventMatchesTrigger(payload.event, triggerId);
      });

      if (!matchingTrigger) {
        this.logger.debug(`Event ${payload.event} does not match any configured trigger`);
        return { success: true, message: 'Event does not match trigger' };
      }

      // Prepare trigger data
      const triggerData = {
        servicenowEvent: {
          event: payload.event,
          timestamp: payload.timestamp || new Date().toISOString(),
          record: payload.record,
          recordNumber: payload.record.number,
          recordSysId: payload.record.sys_id,
          shortDescription: payload.record.short_description,
          state: payload.record.state,
          priority: payload.record.priority,
          assignedTo: payload.record.assigned_to,
        }
      };

      // Execute workflow
      const execution = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: triggerData,
        organization_id: workflowData.organization_id,
        project_id: workflowData.project_id,
      });

      this.logger.log(`Workflow ${workflowId} triggered successfully, execution: ${execution.id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        executionId: execution.id,
      };

    } catch (error: any) {
      this.logger.error(`Error processing ServiceNow webhook:`, error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      return {
        success: false,
        message: 'Failed to process webhook',
        error: error.message,
      };
    }
  }

  private eventMatchesTrigger(event: string, triggerId: string): boolean {
    // Direct match
    if (event === triggerId) return true;

    // Pattern matching for variations
    const triggerEventMap: Record<string, string[]> = {
      'incident_created': ['incident_created', 'incident.created', 'incident_insert'],
      'incident_updated': ['incident_updated', 'incident.updated', 'incident_update'],
      'request_created': ['request_created', 'request.created', 'sc_request_insert'],
      'request_updated': ['request_updated', 'request.updated', 'sc_request_update'],
      'change_created': ['change_created', 'change.created', 'change_request_insert'],
      'change_updated': ['change_updated', 'change.updated', 'change_request_update'],
      'problem_created': ['problem_created', 'problem.created', 'problem_insert'],
      'problem_updated': ['problem_updated', 'problem.updated', 'problem_update'],
    };

    const expectedEvents = triggerEventMap[triggerId] || [triggerId];
    return expectedEvents.includes(event);
  }
}
