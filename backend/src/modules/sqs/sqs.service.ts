import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../database/platform.service';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  CreateQueueCommand,
  GetQueueUrlCommand,
  PurgeQueueCommand,
  GetQueueAttributesCommand,
  SendMessageBatchCommand,
  DeleteMessageBatchCommand,
  Message,
} from '@aws-sdk/client-sqs';

export interface QueueMessage {
  id?: string;
  body: any;
  messageId?: string;
  receiptHandle?: string;
  attributes?: Record<string, string>;
}

export interface QueueOptions {
  delaySeconds?: number;
  messageAttributes?: Record<string, any>;
  messageGroupId?: string;
  messageDeduplicationId?: string;
}

export interface ProcessorFunction {
  (message: any): Promise<void>;
}

export interface JobStatus {
  id: string;
  messageId: string;
  queueName: string;
  jobType: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled' | 'delayed';
  data: any;
  result?: any;
  error?: any;
  progress: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  nextRetryAt?: Date;
}

export interface JobFilter {
  queueName?: string;
  jobType?: string;
  status?: string | string[];
  limit?: number;
  offset?: number;
}

@Injectable()
export class SQSService implements OnModuleInit {
  private readonly logger = new Logger(SQSService.name);
  private sqsClient: SQSClient;
  private queueUrls: Map<string, string> = new Map();
  private processors: Map<string, Map<string, ProcessorFunction>> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isProcessing: Map<string, boolean> = new Map();
  private failedQueues: Set<string> = new Set(); // Track queues that permanently failed
  private sharedQueueUrl: string | null = null; // Shared queue URL from config
  private useSharedQueue = false; // Whether to use shared queue mode

  constructor(
    private configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {
    const region = this.configService.get('AWS_REGION', 'us-east-1');

    // Use SQS-specific credentials if provided, otherwise fall back to general AWS credentials
    const accessKeyId = this.configService.get('SQS_ACCESS_KEY_ID') || this.configService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('SQS_SECRET_ACCESS_KEY') || this.configService.get('AWS_SECRET_ACCESS_KEY');

    this.sqsClient = new SQSClient({
      region,
      credentials: accessKeyId && secretAccessKey ? {
        accessKeyId,
        secretAccessKey,
      } : undefined,
    });

    // Check if shared queue URL is configured
    this.sharedQueueUrl = this.configService.get<string>('SQS_QUEUE_URL') || null;
    this.useSharedQueue = !!this.sharedQueueUrl;

    this.logger.log(`SQS Configuration: useSharedQueue=${this.useSharedQueue}, sharedQueueUrl=${this.sharedQueueUrl}`);
    this.logger.log(`SQS Credentials: using ${this.configService.get('SQS_ACCESS_KEY_ID') ? 'SQS-specific' : 'general AWS'} credentials`);
  }

  async onModuleInit() {
    this.logger.log('🚀 SQS Service initialized');

    // If using shared queue, just validate it exists
    if (this.useSharedQueue && this.sharedQueueUrl) {
      this.logger.log(`📦 Using shared SQS queue: ${this.sharedQueueUrl}`);
      // Map all logical queue names to the shared queue
      this.queueUrls.set('shared', this.sharedQueueUrl);

      // Start polling the shared queue
      setTimeout(() => {
        this.startPolling('shared');
      }, 2000);

      return;
    }

    // Initialize standard queues (legacy mode - separate queues)
    const standardQueues = [
      'email-queue',
      'project-creation',
      'notification-queue',
      'workflow-execution',
      'image-processing',
      'video-processing',
      'search-indexing',
      'deployment-queue',
      'app-generation',
      'app-queue',
      'chatbot-queue',
      'analytics-queue',
      'clickhouse-sync',  // For ClickHouse table synchronization
      'elasticsearch-sync', // For Elasticsearch document synchronization
      'qdrant-sync', // For Qdrant vector synchronization
      'clickhouse-data-sync', // For ClickHouse data synchronization
      // PAO jobs use email-queue with job types: pao-start-research, pao-generate-content
    ];

    for (const queueName of standardQueues) {
      try {
        await this.getQueueUrl(queueName);
        this.logger.log(`✅ Queue initialized: ${queueName}`);
      } catch (error: any) {
        // Log warning but don't crash the application
        this.logger.warn(`⚠️ Queue ${queueName} not available: ${error.message || error}`);
        this.logger.warn(`Please ensure the queue exists or the AWS user has sqs:CreateQueue permission`);
      }
    }

    // Start polling immediately for email queue after processors are registered
    // This is critical for email sending to work
    setTimeout(() => {
      if (this.processors.has('email-queue')) {
        this.logger.log('📧 Starting email queue polling immediately...');
        this.pollQueue('email-queue').catch(err => {
          this.logger.error('Failed to poll email queue on startup:', err);
        });
      }
    }, 5000); // Wait 5 seconds for processors to register
  }

  /**
   * Ensure a queue exists and get its URL
   */
  private async getQueueUrl(queueName: string): Promise<string> {
    // In shared queue mode, always return the shared queue URL
    if (this.useSharedQueue && this.sharedQueueUrl) {
      this.logger.log(`[SQS] Using shared queue URL: ${this.sharedQueueUrl}`);
      return this.sharedQueueUrl;
    }
    this.logger.log(`[SQS] Looking up queue: ${queueName} (useSharedQueue=${this.useSharedQueue}, sharedQueueUrl=${this.sharedQueueUrl})`);
    return this.ensureQueue(queueName);
  }

  private async ensureQueue(queueName: string): Promise<string> {
    // Check if we already have the URL cached
    if (this.queueUrls.has(queueName)) {
      return this.queueUrls.get(queueName)!;
    }

    // Add prefix if configured
    const queuePrefix = this.configService.get('SQS_QUEUE_PREFIX', '');
    const fullQueueName = queuePrefix ? `${queuePrefix}-${queueName}` : queueName;

    try {
      // Try to get existing queue URL
      const getUrlCommand = new GetQueueUrlCommand({ QueueName: fullQueueName });
      const response = await this.sqsClient.send(getUrlCommand);
      this.queueUrls.set(queueName, response.QueueUrl!);
      return response.QueueUrl!;
    } catch (error: any) {
      // Check if queue doesn't exist - if so, try to create it
      if (error.Code === 'AWS.SimpleQueueService.NonExistentQueue' || 
          error.__type?.includes('QueueDoesNotExist') || 
          error.name === 'QueueDoesNotExist') {
        this.logger.log(`Queue ${fullQueueName} does not exist, attempting to create it...`);
      } else {
        // Some other error occurred
        this.logger.error(`Error getting queue URL for ${fullQueueName}:`, error);
        throw error;
      }
      
      // Try to create the queue
      this.logger.log(`Creating queue: ${fullQueueName}`);
      
      // First try to create the dead letter queue
      const dlqName = `${fullQueueName}-dlq`;
      let dlqUrl: string | undefined;
      
      try {
        const dlqCommand = new CreateQueueCommand({
          QueueName: dlqName,
          Attributes: {
            MessageRetentionPeriod: '1209600', // 14 days for DLQ
          },
        });
        const dlqResponse = await this.sqsClient.send(dlqCommand);
        dlqUrl = dlqResponse.QueueUrl!;
      } catch (dlqError: any) {
        // If we can't create the DLQ, log it but continue
        this.logger.warn(`Could not create DLQ ${dlqName}: ${dlqError.message}`);
        // Try to get it in case it exists
        try {
          const getDlqCommand = new GetQueueUrlCommand({ QueueName: dlqName });
          const dlqResponse = await this.sqsClient.send(getDlqCommand);
          dlqUrl = dlqResponse.QueueUrl!;
        } catch {
          // DLQ doesn't exist and can't be created - continue without it
          this.logger.warn(`DLQ ${dlqName} will not be configured`);
        }
      }

      // Create main queue with or without DLQ
      let createAttributes: any = {
        DelaySeconds: '0',
        MessageRetentionPeriod: '345600', // 4 days
        ReceiveMessageWaitTimeSeconds: '20', // Long polling
        VisibilityTimeout: '300', // 5 minutes
      };

      // Only add redrive policy if we have a DLQ
      if (dlqUrl) {
        try {
          const dlqAttrsCommand = new GetQueueAttributesCommand({
            QueueUrl: dlqUrl,
            AttributeNames: ['QueueArn'],
          });
          const dlqAttrsResponse = await this.sqsClient.send(dlqAttrsCommand);
          const dlqArn = dlqAttrsResponse.Attributes?.QueueArn;
          
          if (dlqArn) {
            createAttributes.RedrivePolicy = JSON.stringify({
              deadLetterTargetArn: dlqArn,
              maxReceiveCount: 3, // After 3 attempts, send to DLQ
            });
          }
        } catch (dlqArnError) {
          this.logger.warn(`Could not get DLQ ARN: ${dlqArnError}`);
        }
      }

      const createCommand = new CreateQueueCommand({
        QueueName: fullQueueName,
        Attributes: createAttributes,
      });

      const response = await this.sqsClient.send(createCommand);
      this.queueUrls.set(queueName, response.QueueUrl!);
      if (dlqUrl) {
        this.queueUrls.set(dlqName, dlqUrl);
      }
      return response.QueueUrl!;
    }
  }

  /**
   * Send a message to a queue
   */
  async sendMessage(
    queueName: string,
    jobType: string,
    data: any,
    options: QueueOptions & {
      organizationId?: string;
      projectId?: string;
      appId?: string;
      createdBy?: string;
    } = {},
  ): Promise<string> {
    try {
      const queueUrl = await this.getQueueUrl(queueName);

      this.logger.log(`[SQS] Sending message to ${queueName} - Job: ${jobType}`);
      this.logger.log(`[SQS] Message data: ${JSON.stringify(data).substring(0, 200)}`);

      // Generate a unique jobId for deduplication
      const jobId = this.generateId();

      const messageBody = JSON.stringify({
        jobId, // Add unique ID for deduplication
        queueName, // Include logical queue name for routing in shared queue mode
        jobType,
        data,
        timestamp: new Date().toISOString(),
      });

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        DelaySeconds: options.delaySeconds,
        MessageAttributes: options.messageAttributes ? 
          this.convertToMessageAttributes(options.messageAttributes) : undefined,
        MessageGroupId: options.messageGroupId,
        MessageDeduplicationId: options.messageDeduplicationId,
      });

      const response = await this.sqsClient.send(command);
      const messageId = response.MessageId!;
      this.logger.log(`[SQS] Message sent successfully - ID: ${messageId}`);
      
      // Create job record in database with our jobId
      await this.platformService.query(
        `INSERT INTO job_queue (
          id, message_id, queue_name, job_type, status, data, 
          organization_id, project_id, app_id, created_by, max_attempts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          jobId,
          messageId,
          queueName,
          jobType,
          options.delaySeconds ? 'delayed' : 'pending',
          JSON.stringify(data),
          options.organizationId || null,
          options.projectId || null,
          options.appId || null,
          options.createdBy || null,
          3 // default max_attempts
        ]
      );
      
      this.logger.debug(`Message sent to ${queueName}: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error(`Failed to send message to ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Send multiple messages in batch
   */
  async sendMessageBatch(
    queueName: string,
    messages: Array<{ jobType: string; data: any; options?: QueueOptions }>,
  ): Promise<string[]> {
    try {
      const queueUrl = await this.getQueueUrl(queueName);
      
      const entries = messages.map((msg, index) => ({
        Id: `msg-${index}`,
        MessageBody: JSON.stringify({
          jobType: msg.jobType,
          data: msg.data,
          timestamp: new Date().toISOString(),
        }),
        DelaySeconds: msg.options?.delaySeconds,
        MessageAttributes: msg.options?.messageAttributes ?
          this.convertToMessageAttributes(msg.options.messageAttributes) : undefined,
      }));

      const command = new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: entries,
      });

      const response = await this.sqsClient.send(command);
      return response.Successful?.map(r => r.MessageId!).filter(id => id !== undefined) || [];
    } catch (error) {
      this.logger.error(`Failed to send batch messages to ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Register a processor for a specific job type in a queue
   */
  registerProcessor(
    queueName: string,
    jobType: string,
    processor: ProcessorFunction,
  ) {
    // In shared queue mode, use 'shared' as the queue key but keep queueName in processor map
    const queueKey = this.useSharedQueue ? 'shared' : queueName;

    if (!this.processors.has(queueKey)) {
      this.processors.set(queueKey, new Map());
    }

    // Use queueName:jobType as key to differentiate processors in shared mode
    const processorKey = this.useSharedQueue ? `${queueName}:${jobType}` : jobType;
    this.processors.get(queueKey)!.set(processorKey, processor);
    this.logger.log(`Registered processor for ${queueName}:${jobType}`);

    // Start polling if not already started (for non-shared mode)
    if (!this.useSharedQueue && !this.pollingIntervals.has(queueName)) {
      this.startPolling(queueName);
    }
  }

  /**
   * Start polling a queue for messages
   */
  private startPolling(queueName: string) {
    if (this.pollingIntervals.has(queueName)) {
      return;
    }

    // Start initial poll immediately
    this.pollQueue(queueName).catch(err => {
      this.logger.error(`Initial poll failed for ${queueName}:`, err);
    });

    const pollInterval = setInterval(async () => {
      if (this.isProcessing.get(queueName)) {
        return; // Skip if already processing
      }

      try {
        this.isProcessing.set(queueName, true);
        await this.pollQueue(queueName);
      } catch (error) {
        this.logger.error(`Error polling ${queueName}:`, error);
      } finally {
        this.isProcessing.set(queueName, false);
      }
    }, 30000); // Poll every 30 seconds (prevents overlapping with 20-second long polling)

    this.pollingIntervals.set(queueName, pollInterval);
    this.logger.log(`Started polling for queue: ${queueName}`);
  }

  /**
   * Poll queue for messages and process them
   */
  private async pollQueue(queueName: string) {
    try {
      const queueUrl = await this.getQueueUrl(queueName);

      this.logger.debug(`[SQS] Polling queue ${queueName} at ${queueUrl}`);

      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // Long polling
        VisibilityTimeout: 300,
        MessageAttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);

      if (response.Messages && response.Messages.length > 0) {
        this.logger.log(`📨 [SQS] Received ${response.Messages.length} messages from ${queueName}`);
        for (const message of response.Messages) {
          await this.processMessage(queueName, message);
        }
      } else {
        // Only log every 5th poll to reduce noise
        if (Math.random() < 0.2) {
          this.logger.debug(`[SQS] No messages in ${queueName}`);
        }
      }
    } catch (error: any) {
      // Check for permission/queue existence errors
      const isPermissionError = error.message?.includes('not authorized') ||
                                error.message?.includes('sqs:createqueue') ||
                                error.message?.includes('AWS.SimpleQueueService.NonExistentQueue');

      if (isPermissionError) {
        // Only log once per queue to prevent spam
        if (!this.failedQueues.has(queueName)) {
          this.failedQueues.add(queueName);
          this.logger.warn(`⚠️ Queue ${queueName} unavailable (will not retry): ${error.message}`);
        }
        // Stop polling this queue
        this.stopPolling(queueName);
      } else {
        // Log other types of errors normally
        this.logger.error(`[SQS] Failed to receive messages from ${queueName}:`, error.message || error);
      }
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(queueKey: string, message: Message) {
    let job: any = null;
    try {
      const body = JSON.parse(message.Body!);
      const { jobId, queueName: logicalQueueName, jobType, data } = body;

      // Determine the actual queue name (from message body in shared mode, or from parameter)
      const actualQueueName = this.useSharedQueue ? (logicalQueueName || 'unknown') : queueKey;

      // Check if job already exists (deduplication)
      if (jobId) {
        const result = await this.platformService.query(
          'SELECT * FROM job_queue WHERE id = $1',
          [jobId]
        );
        job = result.rows[0];

        // If job is already completed, just delete the message and return
        if (job && (job.status === 'completed' || job.status === 'active')) {
          this.logger.warn(`Job ${jobId} already ${job.status}, skipping duplicate message`);
          await this.deleteMessage(actualQueueName, message.ReceiptHandle!);
          return;
        }
      }

      // Update job status to active
      if (job) {
        await this.platformService.query(
          `UPDATE job_queue SET
            status = 'active',
            started_at = NOW(),
            receipt_handle = $2,
            attempts = attempts + 1,
            updated_at = NOW()
          WHERE id = $1`,
          [job.id, message.ReceiptHandle]
        );
      } else if (!jobId) {
        // Legacy message without jobId - process anyway but log warning
        this.logger.warn(`Processing message without jobId: ${message.MessageId}`);
      }

      // Find the processor - in shared mode use queueName:jobType, otherwise just jobType
      const processors = this.processors.get(queueKey);
      const processorKey = this.useSharedQueue ? `${actualQueueName}:${jobType}` : jobType;
      const processor = processors?.get(processorKey);

      if (processor) {
        this.logger.debug(`Processing ${actualQueueName}:${jobType} - ${message.MessageId}`);

        await processor({
          id: message.MessageId,
          body: data,
          messageId: message.MessageId,
          receiptHandle: message.ReceiptHandle,
          attributes: message.Attributes,
        });

        // Update job status to completed
        if (job) {
          await this.platformService.query(
            `UPDATE job_queue SET
              status = 'completed',
              completed_at = NOW(),
              progress = 100,
              updated_at = NOW()
            WHERE id = $1`,
            [job.id]
          );
        }

        // Delete message after successful processing
        await this.deleteMessage(actualQueueName, message.ReceiptHandle!);
        this.logger.debug(`Processed and deleted message: ${message.MessageId}`);
      } else {
        this.logger.warn(`No processor found for ${actualQueueName}:${jobType} (key: ${processorKey})`);
        // Don't delete message if no processor found
      }
    } catch (error: any) {
      this.logger.error(`Failed to process message from ${queueKey}:`, error);

      // Update job status to failed
      if (job) {
        const shouldRetry = job.attempts < job.max_attempts;
        const nextRetryAt = shouldRetry ? new Date(Date.now() + Math.pow(2, job.attempts) * 1000) : null;

        await this.platformService.query(
          `UPDATE job_queue SET
            status = $2,
            error = $3,
            updated_at = NOW()
          WHERE id = $1`,
          [
            job.id,
            shouldRetry ? 'pending' : 'failed',
            JSON.stringify({
              message: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString(),
            })
          ]
        );
      }

      // Message will become visible again after VisibilityTimeout for retry
    }
  }

  /**
   * Delete a message from the queue
   */
  private async deleteMessage(queueName: string, receiptHandle: string) {
    const queueUrl = await this.getQueueUrl(queueName);
    
    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.sqsClient.send(command);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string) {
    try {
      const queueUrl = await this.getQueueUrl(queueName);
      
      const command = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: [
          'ApproximateNumberOfMessages',
          'ApproximateNumberOfMessagesNotVisible',
          'ApproximateNumberOfMessagesDelayed',
        ],
      });

      const response = await this.sqsClient.send(command);
      return {
        messagesAvailable: parseInt(response.Attributes?.ApproximateNumberOfMessages || '0'),
        messagesInFlight: parseInt(response.Attributes?.ApproximateNumberOfMessagesNotVisible || '0'),
        messagesDelayed: parseInt(response.Attributes?.ApproximateNumberOfMessagesDelayed || '0'),
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats for ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Purge all messages from a queue
   */
  async purgeQueue(queueName: string) {
    try {
      const queueUrl = await this.getQueueUrl(queueName);
      
      const command = new PurgeQueueCommand({
        QueueUrl: queueUrl,
      });

      await this.sqsClient.send(command);
      this.logger.log(`Purged queue: ${queueName}`);
    } catch (error) {
      this.logger.error(`Failed to purge queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Stop polling for a specific queue
   */
  stopPolling(queueName: string) {
    const interval = this.pollingIntervals.get(queueName);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(queueName);
      this.logger.log(`Stopped polling for queue: ${queueName}`);
    }
  }

  /**
   * Stop all polling
   */
  onModuleDestroy() {
    for (const [queueName, interval] of this.pollingIntervals) {
      clearInterval(interval);
      this.logger.log(`Stopped polling for queue: ${queueName}`);
    }
    this.pollingIntervals.clear();
  }

  /**
   * Get job status by ID
   */
  async getJob(jobId: string): Promise<JobStatus | null> {
    try {
      const result = await this.platformService.query(
        'SELECT * FROM job_queue WHERE id = $1 OR message_id = $2 LIMIT 1',
        [jobId, jobId]
      );
      
      const job = result.rows[0];
      if (!job) {
        return null;
      }

      return {
        id: job.id,
        messageId: job.message_id,
        queueName: job.queue_name,
        jobType: job.job_type,
        status: job.status as any,
        data: job.data ? (typeof job.data === 'string' ? JSON.parse(job.data) : job.data) : null,
        result: job.result ? (typeof job.result === 'string' ? JSON.parse(job.result) : job.result) : null,
        error: job.error,
        progress: job.progress,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        createdAt: job.created_at,
        startedAt: job.started_at || undefined,
        completedAt: job.completed_at || undefined,
        failedAt: job.failed_at || undefined,
        nextRetryAt: job.next_retry_at || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const result = await this.platformService.query(
        'SELECT * FROM job_queue WHERE id = $1 OR message_id = $2 LIMIT 1',
        [jobId, jobId]
      );
      
      const job = result.rows[0];
      if (!job) {
        return false;
      }

      // Can only cancel pending, delayed, or active jobs
      if (!['pending', 'delayed', 'active'].includes(job.status)) {
        return false;
      }

      // Try to delete from SQS if we have a receipt handle
      if (job.receipt_handle && job.status === 'active') {
        try {
          await this.deleteMessage(job.queue_name, job.receipt_handle);
        } catch (error) {
          this.logger.warn(`Failed to delete SQS message for job ${jobId}:`, error);
          // Continue with database update even if SQS deletion fails
        }
      }

      // Update job status in database
      await this.platformService.query(
        `UPDATE job_queue SET 
          status = 'cancelled', 
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1`,
        [job.id]
      );

      this.logger.debug(`Cancelled job: ${jobId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get jobs by status/filter
   */
  async getJobs(filter: JobFilter = {}): Promise<JobStatus[]> {
    try {
      let query = 'SELECT * FROM job_queue WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (filter.queueName) {
        query += ` AND queue_name = $${paramIndex}`;
        params.push(filter.queueName);
        paramIndex++;
      }
      
      if (filter.jobType) {
        query += ` AND job_type = $${paramIndex}`;
        params.push(filter.jobType);
        paramIndex++;
      }
      
      if (filter.status) {
        if (Array.isArray(filter.status)) {
          const placeholders = filter.status.map((_, i) => `$${paramIndex + i}`).join(', ');
          query += ` AND status IN (${placeholders})`;
          params.push(...filter.status);
          paramIndex += filter.status.length;
        } else {
          query += ` AND status = $${paramIndex}`;
          params.push(filter.status);
          paramIndex++;
        }
      }

      query += ' ORDER BY created_at DESC';
      
      const limit = filter.limit || 100;
      const offset = filter.offset || 0;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.platformService.query(query, params);

      return result.rows.map(job => ({
        id: job.id,
        messageId: job.message_id,
        queueName: job.queue_name,
        jobType: job.job_type,
        status: job.status as any,
        data: job.data ? (typeof job.data === 'string' ? JSON.parse(job.data) : job.data) : null,
        result: job.result ? (typeof job.result === 'string' ? JSON.parse(job.result) : job.result) : null,
        error: job.error,
        progress: job.progress,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        createdAt: job.created_at,
        startedAt: job.started_at || undefined,
        completedAt: job.completed_at || undefined,
        failedAt: job.failed_at || undefined,
        nextRetryAt: job.next_retry_at || undefined,
      }));
    } catch (error) {
      this.logger.error('Failed to get jobs:', error);
      throw error;
    }
  }

  /**
   * Update job progress
   */
  async updateJobProgress(jobId: string, progress: number, result?: any): Promise<void> {
    try {
      const jobResult = await this.platformService.query(
        'SELECT id FROM job_queue WHERE id = $1 OR message_id = $2 LIMIT 1',
        [jobId, jobId]
      );

      const job = jobResult.rows[0];
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const normalizedProgress = Math.min(100, Math.max(0, progress));

      // If progress is 100, mark as completed
      if (normalizedProgress === 100) {
        await this.platformService.query(
          `UPDATE job_queue SET
            progress = $2,
            result = $3,
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
          WHERE id = $1`,
          [
            job.id,
            normalizedProgress,
            result ? JSON.stringify(result) : null
          ]
        );
      } else {
        await this.platformService.query(
          `UPDATE job_queue SET
            progress = $2,
            result = $3,
            updated_at = NOW()
          WHERE id = $1`,
          [
            job.id,
            normalizedProgress,
            result ? JSON.stringify(result) : null
          ]
        );
      }
    } catch (error) {
      this.logger.error(`Failed to update job progress ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get dead letter queue messages
   */
  async getDeadLetterQueueMessages(queueName: string): Promise<QueueMessage[]> {
    try {
      const dlqName = `${queueName}-dlq`;
      const dlqUrl = await this.getQueueUrl(dlqName);
      
      const command = new ReceiveMessageCommand({
        QueueUrl: dlqUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 1, // Short polling for DLQ
        MessageAttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);
      
      if (!response.Messages || response.Messages.length === 0) {
        return [];
      }

      return response.Messages.map(message => ({
        id: message.MessageId,
        body: JSON.parse(message.Body!),
        messageId: message.MessageId,
        receiptHandle: message.ReceiptHandle,
        attributes: message.Attributes,
      }));
    } catch (error) {
      this.logger.error(`Failed to get dead letter queue messages for ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Reprocess a message from dead letter queue
   */
  async reprocessDeadLetterMessage(queueName: string, receiptHandle: string): Promise<string> {
    try {
      const dlqName = `${queueName}-dlq`;
      const dlqUrl = await this.getQueueUrl(dlqName);
      
      // Get the message from DLQ
      const receiveCommand = new ReceiveMessageCommand({
        QueueUrl: dlqUrl,
        MaxNumberOfMessages: 1,
        MessageAttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(receiveCommand);
      const message = response.Messages?.[0];
      
      if (!message || message.ReceiptHandle !== receiptHandle) {
        throw new Error('Message not found in dead letter queue');
      }

      const body = JSON.parse(message.Body!);
      
      // Send message back to main queue
      const messageId = await this.sendMessage(queueName, body.jobType, body.data);
      
      // Delete from DLQ
      const deleteCommand = new DeleteMessageCommand({
        QueueUrl: dlqUrl,
        ReceiptHandle: receiptHandle,
      });
      await this.sqsClient.send(deleteCommand);

      this.logger.log(`Reprocessed dead letter message: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error(`Failed to reprocess dead letter message:`, error);
      throw error;
    }
  }

  /**
   * Cleanup old completed/failed jobs
   */
  async cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.platformService.query(
        `DELETE FROM job_queue 
         WHERE status IN ('completed', 'failed', 'cancelled') 
         AND updated_at < $1`,
        [cutoffDate]
      );

      const deletedCount = result.rowCount || 0;
      this.logger.log(`Cleaned up ${deletedCount} old jobs`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old jobs:', error);
      throw error;
    }
  }

  /**
   * Helper to convert attributes to SQS message attributes format
   */
  private convertToMessageAttributes(attributes: Record<string, any>) {
    const messageAttributes: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(attributes)) {
      if (typeof value === 'string') {
        messageAttributes[key] = {
          DataType: 'String',
          StringValue: value,
        };
      } else if (typeof value === 'number') {
        messageAttributes[key] = {
          DataType: 'Number',
          StringValue: value.toString(),
        };
      }
    }
    
    return messageAttributes;
  }

  /**
   * Generate unique ID for jobs (UUID v4 format for database compatibility)
   */
  private generateId(): string {
    // Generate a UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}