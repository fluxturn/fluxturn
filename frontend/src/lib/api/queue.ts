import { api } from '../api';

// Types based on backend DTOs and extended for frontend needs
export interface SendToQueueDto {
  body: Record<string, any>;
  queueUrl: string;
  attributes?: Record<string, any>;
  messageGroupId?: string;
  delaySeconds?: number;
}

export interface ReceiveFromQueueDto {
  queueUrl: string;
  maxMessages?: number;
  visibilityTimeout?: number;
  waitTimeSeconds?: number;
}

export interface DeleteFromQueueDto {
  queueUrl: string;
  receiptHandle: string;
}

// Extended types for comprehensive queue management
export interface QueueMessage {
  messageId: string;
  receiptHandle: string;
  body: Record<string, any>;
  attributes?: Record<string, any>;
  messageGroupId?: string;
  timestamp: string;
  approximateReceiveCount: number;
  approximateFirstReceiveTimestamp?: string;
}

export interface QueueMetrics {
  approximateNumberOfMessages: number;
  approximateNumberOfMessagesNotVisible: number;
  approximateNumberOfMessagesDelayed: number;
  messagesReceived: number;
  messagesSent: number;
  messagesDeleted: number;
  approximateAgeOfOldestMessage?: number;
  throughputPerMinute: number;
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
  deadLetterMessages: number;
}

export interface QueueConfiguration {
  queueUrl: string;
  queueName: string;
  queueType: 'standard' | 'fifo';
  visibilityTimeoutSeconds: number;
  messageRetentionPeriod: number;
  maxMessageSize: number;
  delaySeconds: number;
  receiveMessageWaitTimeSeconds: number;
  deadLetterTargetArn?: string;
  maxReceiveCount?: number;
  contentBasedDeduplication?: boolean;
  fifoThroughputLimit?: 'perQueue' | 'perMessageGroupId';
  deduplicationScope?: 'queue' | 'messageGroup';
}

export interface JobDefinition {
  id: string;
  name: string;
  type: 'immediate' | 'delayed' | 'recurring';
  queueUrl: string;
  payload: Record<string, any>;
  schedule?: string; // cron expression for recurring jobs
  delaySeconds?: number;
  priority?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffType: 'fixed' | 'exponential' | 'linear';
    baseDelay: number;
    maxDelay: number;
  };
  dependencies?: string[]; // job IDs this job depends on
  timeoutSeconds?: number;
  tags?: Record<string, string>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  failureReason?: string;
  executionHistory?: JobExecution[];
}

export interface JobExecution {
  id: string;
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  errorMessage?: string;
  workerInfo?: {
    workerId: string;
    workerHost: string;
  };
  progress?: {
    current: number;
    total: number;
    message?: string;
  };
  logs?: JobLog[];
}

export interface JobLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
}

export interface QueueWorker {
  id: string;
  queueUrl: string;
  status: 'active' | 'idle' | 'stopped' | 'error';
  lastHeartbeat: string;
  currentJobId?: string;
  concurrency: number;
  processedJobs: number;
  failedJobs: number;
  uptime: number;
  host: string;
  version: string;
}

export interface CreateQueueDto {
  queueName: string;
  queueType: 'standard' | 'fifo';
  visibilityTimeoutSeconds?: number;
  messageRetentionPeriod?: number;
  maxMessageSize?: number;
  delaySeconds?: number;
  receiveMessageWaitTimeSeconds?: number;
  deadLetterConfig?: {
    maxReceiveCount: number;
    targetArn?: string;
  };
  contentBasedDeduplication?: boolean;
  fifoThroughputLimit?: 'perQueue' | 'perMessageGroupId';
  deduplicationScope?: 'queue' | 'messageGroup';
  tags?: Record<string, string>;
}

export interface UpdateQueueDto {
  queueUrl: string;
  attributes: Partial<QueueConfiguration>;
}

export interface CreateJobDto {
  name: string;
  type: 'immediate' | 'delayed' | 'recurring';
  queueUrl: string;
  payload: Record<string, any>;
  schedule?: string;
  delaySeconds?: number;
  priority?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffType: 'fixed' | 'exponential' | 'linear';
    baseDelay: number;
    maxDelay: number;
  };
  dependencies?: string[];
  timeoutSeconds?: number;
  tags?: Record<string, string>;
}

export interface BulkJobDto {
  jobs: CreateJobDto[];
  queueUrl: string;
  batchSize?: number;
}

export interface JobSearchFilters {
  status?: JobDefinition['status'][];
  queueUrl?: string;
  type?: JobDefinition['type'][];
  priority?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: Record<string, string>;
  search?: string; // search in job name or payload
}

export interface QueueAnalytics {
  queueUrl: string;
  timeRange: {
    start: string;
    end: string;
  };
  metrics: {
    messagesSent: Array<{ timestamp: string; value: number }>;
    messagesReceived: Array<{ timestamp: string; value: number }>;
    messagesDeleted: Array<{ timestamp: string; value: number }>;
    visibleMessages: Array<{ timestamp: string; value: number }>;
    invisibleMessages: Array<{ timestamp: string; value: number }>;
    delayedMessages: Array<{ timestamp: string; value: number }>;
    averageProcessingTime: Array<{ timestamp: string; value: number }>;
    throughput: Array<{ timestamp: string; value: number }>;
    errorRate: Array<{ timestamp: string; value: number }>;
  };
  summary: {
    totalMessagesSent: number;
    totalMessagesProcessed: number;
    averageProcessingTime: number;
    peakThroughput: number;
    overallSuccessRate: number;
    totalErrors: number;
  };
}

class QueueService {
  /**
   * Send message to queue
   */
  async sendMessage(data: SendToQueueDto): Promise<{ messageId: string; md5OfBody: string }> {
    return api.post('/queue/send', data);
  }

  /**
   * Receive messages from queue
   */
  async receiveMessages(data: ReceiveFromQueueDto): Promise<{ messages: QueueMessage[] }> {
    return api.post('/queue/receive', data);
  }

  /**
   * Delete message from queue
   */
  async deleteMessage(data: DeleteFromQueueDto): Promise<{ success: boolean }> {
    return api.post('/queue/delete', data);
  }

  /**
   * Create a new queue
   */
  async createQueue(data: CreateQueueDto): Promise<{ queueUrl: string }> {
    return api.post('/queue/create', data);
  }

  /**
   * Update queue configuration
   */
  async updateQueue(data: UpdateQueueDto): Promise<{ success: boolean }> {
    return api.put('/queue/update', data);
  }

  /**
   * Delete a queue
   */
  async deleteQueue(queueUrl: string): Promise<{ success: boolean }> {
    return api.delete(`/queue?queueUrl=${encodeURIComponent(queueUrl)}`);
  }

  /**
   * List all queues
   */
  async listQueues(): Promise<{ queues: QueueConfiguration[] }> {
    return api.get('/queue/list');
  }

  /**
   * Get queue configuration and attributes
   */
  async getQueue(queueUrl: string): Promise<QueueConfiguration> {
    return api.get(`/queue/config?queueUrl=${encodeURIComponent(queueUrl)}`);
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueUrl: string): Promise<QueueMetrics> {
    return api.get(`/queue/metrics?queueUrl=${encodeURIComponent(queueUrl)}`);
  }

  /**
   * Get queue analytics with time-series data
   */
  async getQueueAnalytics(queueUrl: string, timeRange: { start: string; end: string }): Promise<QueueAnalytics> {
    return api.get(`/queue/analytics?queueUrl=${encodeURIComponent(queueUrl)}&start=${timeRange.start}&end=${timeRange.end}`);
  }

  /**
   * Create a job
   */
  async createJob(data: CreateJobDto): Promise<JobDefinition> {
    return api.post('/queue/job', data);
  }

  /**
   * Create multiple jobs in bulk
   */
  async createBulkJobs(data: BulkJobDto): Promise<{ jobs: JobDefinition[]; failed: Array<{ error: string; job: CreateJobDto }> }> {
    return api.post('/queue/job/bulk', data);
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<JobDefinition> {
    return api.get(`/queue/job/${jobId}`);
  }

  /**
   * Update job
   */
  async updateJob(jobId: string, updates: Partial<CreateJobDto>): Promise<JobDefinition> {
    return api.put(`/queue/job/${jobId}`, updates);
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<{ success: boolean }> {
    return api.post(`/queue/job/${jobId}/cancel`);
  }

  /**
   * Retry job
   */
  async retryJob(jobId: string): Promise<{ success: boolean }> {
    return api.post(`/queue/job/${jobId}/retry`);
  }

  /**
   * Search jobs with filters
   */
  async searchJobs(filters: JobSearchFilters, page: number = 1, limit: number = 50): Promise<{
    jobs: JobDefinition[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).map(([key, value]) => [
          key,
          typeof value === 'object' ? JSON.stringify(value) : String(value)
        ])
      )
    });
    
    return api.get(`/queue/job/search?${params.toString()}`);
  }

  /**
   * Get job execution history
   */
  async getJobExecutions(jobId: string): Promise<JobExecution[]> {
    return api.get(`/queue/job/${jobId}/executions`);
  }

  /**
   * Get job logs
   */
  async getJobLogs(jobId: string, executionId?: string): Promise<JobLog[]> {
    const url = executionId 
      ? `/queue/job/${jobId}/executions/${executionId}/logs`
      : `/queue/job/${jobId}/logs`;
    return api.get(url);
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(queueUrl: string): Promise<{ success: boolean }> {
    return api.post(`/queue/pause`, { queueUrl });
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(queueUrl: string): Promise<{ success: boolean }> {
    return api.post(`/queue/resume`, { queueUrl });
  }

  /**
   * Purge all messages from queue
   */
  async purgeQueue(queueUrl: string): Promise<{ success: boolean }> {
    return api.post(`/queue/purge`, { queueUrl });
  }

  /**
   * Get dead letter queue messages
   */
  async getDeadLetterMessages(queueUrl: string, page: number = 1, limit: number = 50): Promise<{
    messages: QueueMessage[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return api.get(`/queue/dlq?queueUrl=${encodeURIComponent(queueUrl)}&page=${page}&limit=${limit}`);
  }

  /**
   * Requeue dead letter message
   */
  async requeueDeadLetterMessage(queueUrl: string, messageId: string): Promise<{ success: boolean }> {
    return api.post(`/queue/dlq/requeue`, { queueUrl, messageId });
  }

  /**
   * Bulk requeue dead letter messages
   */
  async requeueDeadLetterMessages(queueUrl: string, messageIds: string[]): Promise<{ 
    successful: string[];
    failed: Array<{ messageId: string; error: string }>;
  }> {
    return api.post(`/queue/dlq/requeue/bulk`, { queueUrl, messageIds });
  }

  /**
   * Get queue workers
   */
  async getQueueWorkers(queueUrl?: string): Promise<QueueWorker[]> {
    const url = queueUrl 
      ? `/queue/workers?queueUrl=${encodeURIComponent(queueUrl)}`
      : '/queue/workers';
    return api.get(url);
  }

  /**
   * Start a worker
   */
  async startWorker(queueUrl: string, config?: { concurrency?: number }): Promise<QueueWorker> {
    return api.post(`/queue/workers/start`, { queueUrl, ...config });
  }

  /**
   * Stop a worker
   */
  async stopWorker(workerId: string): Promise<{ success: boolean }> {
    return api.post(`/queue/workers/${workerId}/stop`);
  }

  /**
   * Scale workers for a queue
   */
  async scaleWorkers(queueUrl: string, targetWorkers: number): Promise<{ 
    started: QueueWorker[];
    stopped: string[];
  }> {
    return api.post(`/queue/workers/scale`, { queueUrl, targetWorkers });
  }

  /**
   * Get real-time queue status (polling utility)
   */
  async pollQueueStatus(queueUrl: string, callback: (metrics: QueueMetrics) => void, interval: number = 5000): Promise<() => void> {
    const poll = async () => {
      try {
        const metrics = await this.getQueueMetrics(queueUrl);
        callback(metrics);
      } catch (error) {
        console.error('Error polling queue status:', error);
      }
    };

    const intervalId = setInterval(poll, interval);
    
    // Initial poll
    poll();

    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  /**
   * Get dashboard overview data
   */
  async getDashboardOverview(): Promise<{
    totalQueues: number;
    totalJobs: number;
    activeJobs: number;
    failedJobs: number;
    totalWorkers: number;
    activeWorkers: number;
    totalMessages: number;
    messagesPerMinute: number;
    systemHealth: {
      overallStatus: 'healthy' | 'warning' | 'critical';
      issues: Array<{
        type: 'error' | 'warning';
        message: string;
        queueUrl?: string;
      }>;
    };
  }> {
    return api.get('/queue/dashboard');
  }
}

export const queueApi = new QueueService();
export default queueApi;