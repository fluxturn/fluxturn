import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSService } from '../sqs/sqs.service';

export interface AuthContext {
  type: 'jwt' | 'apikey';
  userId?: string;
}

export interface WorkflowJobData {
  workflowId: string;
  executionId: string;
  userId: string;
  inputData?: Record<string, any>;
  steps: any[];
  metadata?: Record<string, any>;
}

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private readonly WORKFLOW_QUEUE = 'workflow-execution';

  constructor(
    private readonly configService: ConfigService,
    private readonly sqsService: SQSService
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing SQS Queue Service...');
    this.logger.log('SQS Queue Service initialized successfully');
  }

  /**
   * Add workflow execution job to queue
   */
  async addWorkflowJob(data: WorkflowJobData, priority?: number): Promise<string> {
    try {
      const messageId = await this.sqsService.sendMessage(
        this.WORKFLOW_QUEUE,
        'execute-workflow',
        data,
        {
          messageAttributes: {
            priority: priority || 0,
          },
        }
      );

      this.logger.log(`Added workflow job ${messageId} to queue`);
      return messageId;
    } catch (error) {
      this.logger.error('Failed to add workflow job:', error);
      throw error;
    }
  }

  /**
   * Add delayed workflow job (for scheduled workflows)
   */
  async addDelayedWorkflowJob(
    data: WorkflowJobData,
    delayMs: number
  ): Promise<string> {
    try {
      const messageId = await this.sqsService.sendMessage(
        this.WORKFLOW_QUEUE,
        'execute-workflow',
        data,
        {
          delaySeconds: Math.min(Math.floor(delayMs / 1000), 900), // SQS max delay is 15 minutes (900 seconds)
        }
      );

      this.logger.log(`Added delayed workflow job ${messageId} with delay ${delayMs}ms`);
      return messageId;
    } catch (error) {
      this.logger.error('Failed to add delayed workflow job:', error);
      throw error;
    }
  }

  /**
   * Add recurring workflow job (for scheduled workflows)
   * Note: SQS doesn't support cron natively. This would need to be handled by a scheduler
   * that periodically adds jobs to the queue. For now, just add a regular job.
   */
  async addRecurringWorkflowJob(
    data: WorkflowJobData,
    cronExpression: string
  ): Promise<string> {
    try {
      this.logger.warn(`SQS does not support native cron scheduling. Consider using @nestjs/schedule for recurring workflows.`);

      // For now, just add a regular job
      const messageId = await this.sqsService.sendMessage(
        this.WORKFLOW_QUEUE,
        'execute-workflow',
        data,
        {
          messageAttributes: {
            cronExpression,
            isRecurring: 'true',
          },
        }
      );

      this.logger.log(`Added workflow job ${messageId} (marked for recurring: ${cronExpression})`);
      return messageId;
    } catch (error) {
      this.logger.error('Failed to add recurring workflow job:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    try {
      const job = await this.sqsService.getJob(jobId);

      if (!job) {
        return null;
      }

      return {
        id: job.id,
        name: job.jobType,
        data: job.data,
        state: job.status,
        progress: job.progress,
        result: job.result,
        failedReason: job.error,
        attemptsMade: job.attempts,
        timestamp: job.createdAt,
        processedOn: job.startedAt,
        finishedOn: job.completedAt || job.failedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status for ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const result = await this.sqsService.cancelJob(jobId);

      if (result) {
        this.logger.log(`Cancelled job ${jobId}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.sqsService.getJob(jobId);

      if (!job || job.status !== 'failed') {
        return false;
      }

      // Re-send the job to the queue
      const messageId = await this.sqsService.sendMessage(
        this.WORKFLOW_QUEUE,
        job.jobType,
        job.data
      );

      this.logger.log(`Retrying job ${jobId} with new message ${messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to retry job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<any> {
    try {
      const sqsStats = await this.sqsService.getQueueStats(this.WORKFLOW_QUEUE);

      // Get database stats for completed/failed jobs
      const jobs = await this.sqsService.getJobs({
        queueName: this.WORKFLOW_QUEUE,
        limit: 10000,
      });

      const completed = jobs.filter(j => j.status === 'completed').length;
      const failed = jobs.filter(j => j.status === 'failed').length;
      const active = jobs.filter(j => j.status === 'active').length;

      return {
        waiting: sqsStats.messagesAvailable,
        active,
        completed,
        failed,
        delayed: sqsStats.messagesDelayed,
        total: sqsStats.messagesAvailable + active + completed + failed + sqsStats.messagesDelayed,
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Get recent jobs
   */
  async getRecentJobs(limit: number = 10): Promise<any[]> {
    try {
      const jobs = await this.sqsService.getJobs({
        queueName: this.WORKFLOW_QUEUE,
        status: ['completed', 'failed', 'active', 'pending'],
        limit,
      });

      return jobs.map(job => ({
        id: job.id,
        name: job.jobType,
        data: job.data,
        state: job.status,
        progress: job.progress,
        attemptsMade: job.attempts,
        timestamp: job.createdAt,
        processedOn: job.startedAt,
        finishedOn: job.completedAt || job.failedAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get recent jobs:', error);
      throw error;
    }
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<any> {
    try {
      const olderThanDays = Math.floor(olderThanMs / (24 * 60 * 60 * 1000));
      const total = await this.sqsService.cleanupOldJobs(olderThanDays);

      this.logger.log(`Cleaned ${total} old jobs from queue`);

      return {
        completedCleaned: total,
        failedCleaned: 0,
        total,
      };
    } catch (error) {
      this.logger.error('Failed to clean queue:', error);
      throw error;
    }
  }

  /**
   * Pause queue
   */
  async pauseQueue(): Promise<void> {
    try {
      this.sqsService.stopPolling(this.WORKFLOW_QUEUE);
      this.logger.log('Queue paused');
    } catch (error) {
      this.logger.error('Failed to pause queue:', error);
      throw error;
    }
  }

  /**
   * Resume queue
   */
  async resumeQueue(): Promise<void> {
    try {
      // Note: SQS will auto-resume on next module init
      this.logger.warn('SQS queues will auto-resume on next application restart');
      this.logger.log('Queue resume requested (takes effect on restart)');
    } catch (error) {
      this.logger.error('Failed to resume queue:', error);
      throw error;
    }
  }
}
