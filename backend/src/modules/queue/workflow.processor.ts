import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../database/platform.service';
import { ConnectorsService } from '../fluxturn/connectors/connectors.service';
import { SQSService } from '../sqs/sqs.service';
import { WorkflowJobData } from './queue.service';

@Injectable()
export class WorkflowProcessor implements OnModuleInit {
  private readonly logger = new Logger(WorkflowProcessor.name);
  private readonly WORKFLOW_QUEUE = 'workflow-execution';

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
    private readonly connectorsService: ConnectorsService,
    private readonly sqsService: SQSService
  ) {}

  onModuleInit() {
    // Register processor with SQS service
    this.sqsService.registerProcessor(
      this.WORKFLOW_QUEUE,
      'execute-workflow',
      async (message: any) => {
        await this.processWorkflowJob(message.body);
      }
    );

    this.logger.log('Workflow processor initialized with SQS');
  }

  /**
   * Process workflow execution job
   */
  private async processWorkflowJob(jobData: WorkflowJobData): Promise<any> {
    const { workflowId, executionId, userId, inputData, steps, metadata } = jobData;

    this.logger.log(`Processing workflow ${workflowId}, execution ${executionId}`);

    let currentStepNumber = 0; // Define at function scope for error handling

    try {
      // Update execution status to running
      await this.updateExecutionStatus(executionId, 'running', 0);

      const startTime = Date.now();
      const stepResults = [];
      let stepsCompleted = 0;

      // Process each step
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepNumber = i + 1;
        currentStepNumber = stepNumber;

        // Update progress
        const progress = Math.round((stepNumber / steps.length) * 100);
        // Note: Progress can be tracked in database via execution status

        this.logger.log(
          `Executing step ${stepNumber}/${steps.length} for workflow ${workflowId}: ${step.action}`
        );

        // Track step execution time (declare before try-catch)
        const stepStartTime = Date.now();

        try {
          // Execute step using connectors service
          const stepResult = await this.executeStep(step, inputData, userId, executionId);

          const stepExecutionTime = Date.now() - stepStartTime;

          stepResults.push({
            stepId: step.id,
            stepNumber,
            connector: step.connector,
            action: step.action,
            status: 'success',
            output: stepResult,
            executionTime: stepExecutionTime,
            executedAt: new Date(),
          });

          stepsCompleted++;

          // Log successful step execution with input/output and timing
          await this.logStepExecution(
            executionId,
            step,
            'success',
            stepResult,
            userId,
            step.params,
            stepExecutionTime
          );

        } catch (stepError) {
          this.logger.error(`Step ${stepNumber} failed:`, stepError);

          const stepExecutionTime = Date.now() - stepStartTime;

          // Log failed step with input data
          await this.logStepExecution(
            executionId,
            step,
            'failed',
            { error: stepError.message },
            userId,
            step.params,
            stepExecutionTime
          );

          // Check if step is marked as critical
          if (step.onError === 'stop' || step.critical) {
            throw new Error(`Critical step ${stepNumber} failed: ${stepError.message}`);
          }

          // Continue with next step if not critical
          stepResults.push({
            stepId: step.id,
            stepNumber,
            connector: step.connector,
            action: step.action,
            status: 'failed',
            error: stepError.message,
            executedAt: new Date(),
          });
        }
      }

      const duration = Date.now() - startTime;
      const finalStatus = stepsCompleted === steps.length ? 'completed' : 'partial';

      // Update execution with final results
      await this.updateExecutionStatus(
        executionId,
        finalStatus,
        stepsCompleted,
        {
          steps: stepResults,
          summary: {
            totalSteps: steps.length,
            completedSteps: stepsCompleted,
            failedSteps: steps.length - stepsCompleted,
            duration,
          },
        }
      );

      // Update workflow statistics
      await this.updateWorkflowStats(workflowId, finalStatus);

      return {
        success: true,
        executionId,
        status: finalStatus,
        stepsCompleted,
        totalSteps: steps.length,
        duration,
        results: stepResults,
      };

    } catch (error) {
      this.logger.error(`Workflow ${workflowId} execution failed:`, error);

      // Update execution status to failed
      await this.updateExecutionStatus(executionId, 'failed', currentStepNumber || 0, {
        error: error.message,
        stack: error.stack,
      });

      // Update workflow statistics
      await this.updateWorkflowStats(workflowId, 'failed');

      throw error;
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: any,
    inputData: Record<string, any>,
    userId: string,
    executionId: string
  ): Promise<any> {
    const { connector, action, params, connector_config_id } = step;

    this.logger.log('=== WORKFLOW STEP EXECUTION START ===');
    this.logger.log(`Step details:`, JSON.stringify({
      connector,
      action,
      connector_config_id,
      params
    }, null, 2));

    // Build step parameters by merging step params with input data
    let stepParams = {
      ...params,
      // Allow referencing previous step outputs using ${steps.stepId.field} syntax
      ...this.resolveStepReferences(params, inputData),
    };

    this.logger.log(`Step params before conversion:`, JSON.stringify(stepParams, null, 2));

    // Special handling for Google Sheets: Convert string values to 2D array
    if (connector === 'google_sheets' && stepParams.values) {
      if (typeof stepParams.values === 'string') {
        // Convert single string to 2D array format that Google Sheets API expects
        stepParams.values = [[stepParams.values]];
        this.logger.log(`Converted string value to 2D array: ${JSON.stringify(stepParams.values)}`);
      } else if (Array.isArray(stepParams.values) && !Array.isArray(stepParams.values[0])) {
        // Convert 1D array to 2D array
        stepParams.values = [stepParams.values];
        this.logger.log(`Converted 1D array to 2D array: ${JSON.stringify(stepParams.values)}`);
      }
    }

    this.logger.log(`Final params being sent:`, JSON.stringify(stepParams, null, 2));

    // Execute connector action through connectors service
    try {
      this.logger.log(`Calling executeConnectorAction with config_id: ${connector_config_id}`);

      const result = await this.connectorsService.executeConnectorAction(
        connector_config_id,
        {
          action: action,
          parameters: stepParams
        },
        {
          type: 'jwt',
          userId: userId
        }
      );

      this.logger.log(`Action result:`, JSON.stringify(result, null, 2));

      if (!result.success) {
        throw new Error(result.error?.message || 'Connector action failed');
      }

      this.logger.log('=== WORKFLOW STEP EXECUTION SUCCESS ===');
      return result.data;
    } catch (error) {
      this.logger.error(`=== WORKFLOW STEP EXECUTION FAILED ===`);
      this.logger.error(`Connector action failed (connector: ${connector}, action: ${action}):`, error);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Resolve step parameter references (e.g., ${steps.stepId.field})
   */
  private resolveStepReferences(
    params: Record<string, any>,
    context: Record<string, any>
  ): Record<string, any> {
    const resolved = { ...params };

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.includes('${')) {
        // Simple variable substitution
        resolved[key] = value.replace(/\$\{([^}]+)\}/g, (match, path) => {
          const keys = path.split('.');
          let result = context;

          for (const k of keys) {
            result = result?.[k];
            if (result === undefined) break;
          }

          return result !== undefined ? String(result) : match;
        });
      }
    }

    return resolved;
  }

  /**
   * Update execution status in database
   */
  private async updateExecutionStatus(
    executionId: string,
    status: string,
    stepsCompleted: number,
    outputData?: any
  ): Promise<void> {
    const query = outputData
      ? `
        UPDATE workflow_executions
        SET status = $2, steps_completed = $3, output_data = $4, updated_at = NOW()
        WHERE id = $1
      `
      : `
        UPDATE workflow_executions
        SET status = $2, steps_completed = $3, updated_at = NOW()
        WHERE id = $1
      `;

    const values = outputData
      ? [executionId, status, stepsCompleted, JSON.stringify(outputData)]
      : [executionId, status, stepsCompleted];

    await this.platformService.query(query, values);
  }

  /**
   * Log step execution to database with input/output data
   */
  private async logStepExecution(
    executionId: string,
    step: any,
    status: string,
    result: any,
    userId: string,
    inputData?: any,
    executionTime?: number
  ): Promise<void> {
    const query = `
      INSERT INTO connector_execution_logs (
        id, workflow_execution_id, user_id, connector_id, action,
        status, request_data, response_data, duration_ms, started_at, completed_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        $5, $6, $7, $8, NOW(), NOW()
      )
    `;

    await this.platformService.query(query, [
      executionId,
      userId,
      step.connector,
      step.action,
      status,
      JSON.stringify({
        step: step,
        input: inputData || step.params || {}
      }),
      JSON.stringify({
        output: result,
        itemCount: Array.isArray(result) ? result.length : 1
      }),
      executionTime || 0
    ]);
  }

  /**
   * Update workflow statistics
   */
  private async updateWorkflowStats(workflowId: string, status: string): Promise<void> {
    const query =
      status === 'completed'
        ? `
      UPDATE workflows
      SET
        run_count = run_count + 1,
        success_count = success_count + 1,
        last_run_at = NOW(),
        last_run_status = $2
      WHERE id = $1
    `
        : `
      UPDATE workflows
      SET
        run_count = run_count + 1,
        failure_count = failure_count + 1,
        last_run_at = NOW(),
        last_run_status = $2
      WHERE id = $1
    `;

    await this.platformService.query(query, [workflowId, status]);
  }

}
