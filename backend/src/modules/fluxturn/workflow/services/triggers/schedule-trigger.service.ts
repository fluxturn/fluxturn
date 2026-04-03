import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../workflow.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../interfaces/trigger.interface';
import { scheduleToCron, scheduleDescription } from '../../utils/scheduleHelpers';

/**
 * Schedule Trigger Service
 *
 * Handles schedule-based workflow execution using cron expressions.
 * Similar to n8n's Schedule Trigger, supports:
 * - Custom cron expressions
 * - Timezone configuration
 * - Common presets (hourly, daily, weekly, etc.)
 *
 * Examples:
 * - Every hour at minute 0
 * - Every weekday at 9 AM
 * - Every 15 minutes
 */
@Injectable()
export class ScheduleTriggerService implements ITriggerService {
  private readonly logger = new Logger(ScheduleTriggerService.name);

  // Track active cron jobs per workflow
  private activeJobs = new Map<string, CronJob>();

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly schedulerRegistry: SchedulerRegistry
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.SCHEDULE;
  }

  /**
   * Activate schedule trigger for a workflow
   * Creates a cron job that will execute the workflow at specified intervals
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating schedule trigger for workflow: ${workflowId}`);

      // Get workflow
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        return {
          success: false,
          message: 'Workflow not found',
          error: 'Workflow not found',
        };
      }

      // Find schedule trigger node
      const scheduleTrigger = this.findScheduleTrigger(workflow);
      if (!scheduleTrigger) {
        return {
          success: false,
          message: 'No schedule trigger found in workflow',
          error: 'No schedule trigger found',
        };
      }

      // Get cron expression from trigger config
      // Support both new schedule object format and legacy cron string format
      let cronExpression: string;
      let scheduleConfig = scheduleTrigger.data?.schedule || triggerConfig?.schedule;

      if (scheduleConfig && typeof scheduleConfig === 'object') {
        // New format: schedule configuration object
        try {
          cronExpression = scheduleToCron(scheduleConfig);
          this.logger.log(`Converted schedule config to cron: ${cronExpression}`);
        } catch (error: any) {
          return {
            success: false,
            message: 'Invalid schedule configuration',
            error: `Failed to convert schedule to cron: ${error.message}`,
          };
        }
      } else {
        // Legacy format: direct cron expression
        cronExpression = scheduleTrigger.data?.cron || triggerConfig?.cron;
      }

      if (!cronExpression) {
        return {
          success: false,
          message: 'Schedule not configured',
          error: 'Missing schedule configuration or cron expression',
        };
      }

      // Get timezone (defaults to UTC if not specified)
      const timezone = scheduleTrigger.data?.timezone || triggerConfig?.timezone || 'UTC';

      // Validate cron expression
      try {
        // Test if cron expression is valid by creating a temporary job
        new CronJob(cronExpression, () => {}, null, false, timezone);
      } catch (error: any) {
        return {
          success: false,
          message: 'Invalid cron expression',
          error: `Cron validation failed: ${error.message}`,
        };
      }

      // Stop existing job if any
      await this.deactivate(workflowId);

      // Create cron job
      const cronJob = new CronJob(
        cronExpression,
        async () => {
          await this.executeScheduledWorkflow(workflowId, workflow.name);
        },
        null, // onComplete callback
        false, // start immediately = false (we'll start it manually)
        timezone
      );

      // Store job reference
      this.activeJobs.set(workflowId, cronJob);

      // Start the cron job
      cronJob.start();

      this.logger.log(
        `Schedule trigger activated for workflow ${workflowId} - ` +
        `Cron: ${cronExpression}, Timezone: ${timezone}`
      );

      // Calculate next execution time
      const nextExecution = cronJob.nextDate().toJSDate();

      // Generate description
      let description: string;
      if (scheduleConfig && typeof scheduleConfig === 'object') {
        description = scheduleDescription(scheduleConfig);
      } else {
        description = this.getCronDescription(cronExpression);
      }

      return {
        success: true,
        message: 'Schedule trigger activated',
        data: {
          cronExpression,
          timezone,
          nextExecution: nextExecution.toISOString(),
          nextExecutionLocal: nextExecution.toString(),
          description,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to activate schedule trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate schedule trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate schedule trigger for a workflow
   * Stops the cron job and removes it from active jobs
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating schedule trigger for workflow: ${workflowId}`);

      const job = this.activeJobs.get(workflowId);
      if (job) {
        job.stop();
        this.activeJobs.delete(workflowId);
        this.logger.log(`Stopped and removed cron job for workflow ${workflowId}`);
      }

      return {
        success: true,
        message: 'Schedule trigger deactivated',
      };
    } catch (error: any) {
      this.logger.error(`Failed to deactivate schedule trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to deactivate schedule trigger',
      };
    }
  }

  /**
   * Get schedule trigger status for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      const job = this.activeJobs.get(workflowId);

      if (job) {
        const nextExecution = job.nextDate().toJSDate();

        return {
          active: true,
          type: TriggerType.SCHEDULE,
          message: 'Schedule trigger active',
          metadata: {
            running: true,
            nextExecution: nextExecution.toISOString(),
            nextExecutionLocal: nextExecution.toString(),
          },
        };
      }

      return {
        active: false,
        type: TriggerType.SCHEDULE,
        message: 'Schedule trigger not active',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get schedule trigger status for workflow ${workflowId}:`, error);
      return {
        active: false,
        type: TriggerType.SCHEDULE,
        message: 'Error retrieving status',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Execute workflow when scheduled time is reached
   */
  private async executeScheduledWorkflow(workflowId: string, workflowName: string): Promise<void> {
    this.logger.log(`Executing scheduled workflow: ${workflowName} (${workflowId})`);

    try {
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          triggeredAt: new Date().toISOString(),
          trigger: 'schedule',
          triggerType: 'schedule_cron',
        },
      });

      this.logger.log(
        `Successfully executed scheduled workflow ${workflowId}. ` +
        `Execution ID: ${result.id}`
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to execute scheduled workflow ${workflowId}:`,
        error.message
      );
      // Don't throw - we want the cron job to continue running
    }
  }

  /**
   * Find schedule trigger node in workflow
   */
  private findScheduleTrigger(workflow: any): any | null {
    const canvas = workflow.workflow?.canvas || workflow.canvas;
    if (!canvas || !canvas.nodes) return null;

    return canvas.nodes.find(
      (node: any) => node.type === 'SCHEDULE_TRIGGER'
    );
  }

  /**
   * Get human-readable description of cron expression
   * Provides helpful descriptions for common patterns
   */
  private getCronDescription(cron: string): string {
    const descriptions: Record<string, string> = {
      '* * * * *': 'Every minute',
      '*/5 * * * *': 'Every 5 minutes',
      '*/10 * * * *': 'Every 10 minutes',
      '*/15 * * * *': 'Every 15 minutes',
      '*/30 * * * *': 'Every 30 minutes',
      '0 * * * *': 'Every hour',
      '0 */2 * * *': 'Every 2 hours',
      '0 */3 * * *': 'Every 3 hours',
      '0 */6 * * *': 'Every 6 hours',
      '0 */12 * * *': 'Every 12 hours',
      '0 0 * * *': 'Every day at midnight',
      '0 9 * * *': 'Every day at 9 AM',
      '0 12 * * *': 'Every day at noon',
      '0 17 * * *': 'Every day at 5 PM',
      '0 9 * * MON-FRI': 'Every weekday at 9 AM',
      '0 0 * * MON': 'Every Monday at midnight',
      '0 0 1 * *': 'First day of every month at midnight',
      '0 0 1 1 *': 'January 1st at midnight (yearly)',
    };

    return descriptions[cron] || `Custom schedule: ${cron}`;
  }

  /**
   * Manually trigger a workflow once (for testing)
   * Useful for testing schedule triggers without waiting
   */
  async triggerManual(workflowId: string): Promise<any> {
    try {
      this.logger.log(`Manually triggering scheduled workflow ${workflowId}`);

      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      await this.executeScheduledWorkflow(workflowId, workflow.name);

      return {
        success: true,
        message: 'Manual trigger completed',
      };
    } catch (error: any) {
      this.logger.error(`Failed to manually trigger workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active schedule triggers (for debugging/monitoring)
   */
  getActiveSchedules(): Array<{ workflowId: string; nextExecution: string }> {
    const schedules: Array<{ workflowId: string; nextExecution: string }> = [];

    this.activeJobs.forEach((job, workflowId) => {
      // If job exists in activeJobs, it's running
      schedules.push({
        workflowId,
        nextExecution: job.nextDate().toJSDate().toISOString(),
      });
    });

    return schedules;
  }
}
