import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../database/platform.service';
import { v4 as uuidv4 } from 'uuid';
import { DeadLetterStatus } from './dto/dead-letter.dto';

@Injectable()
export class DeadLetterService {
  private readonly logger = new Logger(DeadLetterService.name);

  constructor(
    private readonly platformService: PlatformService,
  ) {}

  /**
   * Ensure the dead_letter_queue table exists on module init
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.platformService.query(`
        CREATE TABLE IF NOT EXISTS dead_letter_queue (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID,
          workflow_id UUID NOT NULL,
          execution_id UUID NOT NULL,
          failed_step_id VARCHAR(255),
          failed_step_name VARCHAR(255),
          error_message TEXT,
          error_stack TEXT,
          input_data JSONB DEFAULT '{}',
          workflow_snapshot JSONB DEFAULT '{}',
          status VARCHAR(20) NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'retried', 'discarded')),
          retry_execution_id UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      this.logger.log('dead_letter_queue table ensured');
    } catch (error) {
      this.logger.error('Failed to create dead_letter_queue table', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Add to DLQ
  // ---------------------------------------------------------------------------

  /**
   * Called after all retries are exhausted for a workflow execution.
   */
  async addToDeadLetter(params: {
    executionId: string;
    workflowId: string;
    failedStepId?: string;
    failedStepName?: string;
    error: { message: string; stack?: string };
    inputData?: any;
    workflowSnapshot?: any;
    organizationId?: string;
  }): Promise<any> {
    const id = uuidv4();
    const result = await this.platformService.query(
      `INSERT INTO dead_letter_queue
        (id, organization_id, workflow_id, execution_id,
         failed_step_id, failed_step_name, error_message, error_stack,
         input_data, workflow_snapshot, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`,
      [
        id,
        params.organizationId || null,
        params.workflowId,
        params.executionId,
        params.failedStepId || null,
        params.failedStepName || null,
        params.error.message,
        params.error.stack || null,
        JSON.stringify(params.inputData || {}),
        JSON.stringify(params.workflowSnapshot || {}),
        DeadLetterStatus.PENDING,
      ],
    );

    this.logger.log(
      `Added execution ${params.executionId} to dead letter queue (DLQ item ${id})`,
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // List / Get
  // ---------------------------------------------------------------------------

  async listDeadLetterItems(
    orgId: string,
    filters: {
      workflow_id?: string;
      status?: DeadLetterStatus;
      date_from?: string;
      date_to?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: any[]; total: number }> {
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [orgId];
    let paramIdx = 2;

    if (filters.workflow_id) {
      conditions.push(`workflow_id = $${paramIdx++}`);
      params.push(filters.workflow_id);
    }
    if (filters.status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(filters.status);
    }
    if (filters.date_from) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(filters.date_to);
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [countResult, dataResult] = await Promise.all([
      this.platformService.query(
        `SELECT COUNT(*) AS total FROM dead_letter_queue WHERE ${whereClause}`,
        params,
      ),
      this.platformService.query(
        `SELECT * FROM dead_letter_queue
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
        [...params, limit, offset],
      ),
    ]);

    return {
      items: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
    };
  }

  async getDeadLetterItem(id: string, orgId: string): Promise<any> {
    const result = await this.platformService.query(
      `SELECT * FROM dead_letter_queue WHERE id = $1 AND organization_id = $2`,
      [id, orgId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Dead letter queue item not found');
    }
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Retry
  // ---------------------------------------------------------------------------

  /**
   * Re-execute the workflow from the point of failure.
   * Creates a new execution starting from the failed step.
   */
  async retryFromDeadLetter(
    dlqItemId: string,
    orgId: string,
  ): Promise<any> {
    const item = await this.getDeadLetterItem(dlqItemId, orgId);

    if (item.status !== DeadLetterStatus.PENDING) {
      throw new BadRequestException(
        `Cannot retry DLQ item with status '${item.status}'. Only 'pending' items can be retried.`,
      );
    }

    // Load workflow from DB to get current definition
    const workflowResult = await this.platformService.query(
      `SELECT * FROM workflows WHERE id = $1`,
      [item.workflow_id],
    );

    if (workflowResult.rows.length === 0) {
      throw new NotFoundException(
        `Workflow ${item.workflow_id} no longer exists; cannot retry.`,
      );
    }

    const workflow = workflowResult.rows[0];
    const canvas = workflow.canvas || { nodes: [], edges: [] };

    // Determine start node: the failed step if it exists in the current workflow,
    // otherwise fall back to the beginning
    const failedStepId = item.failed_step_id;
    const startNodeId =
      failedStepId && canvas.nodes?.find((n: any) => n.id === failedStepId)
        ? failedStepId
        : undefined;

    // Create a new execution record
    const newExecutionId = uuidv4();
    const executionNumber = await this.getNextExecutionNumber(item.workflow_id);

    const inputData =
      typeof item.input_data === 'string'
        ? JSON.parse(item.input_data)
        : item.input_data || {};

    await this.platformService.query(
      `INSERT INTO workflow_executions
        (id, workflow_id, organization_id, execution_number, status,
         input_data, total_steps, started_at, created_at)
       VALUES ($1, $2, $3, $4, 'running', $5, $6, NOW(), NOW())`,
      [
        newExecutionId,
        item.workflow_id,
        orgId,
        executionNumber,
        JSON.stringify(inputData),
        canvas.nodes?.length || 0,
      ],
    );

    // Mark DLQ item as retried
    await this.platformService.query(
      `UPDATE dead_letter_queue
       SET status = $1, retry_execution_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [DeadLetterStatus.RETRIED, newExecutionId, dlqItemId],
    );

    this.logger.log(
      `DLQ item ${dlqItemId} marked as retried; new execution ${newExecutionId}` +
        (startNodeId ? ` starting from step ${startNodeId}` : ''),
    );

    return {
      dlq_item_id: dlqItemId,
      new_execution_id: newExecutionId,
      workflow_id: item.workflow_id,
      start_node_id: startNodeId || null,
      message: 'Retry execution created. The execution will be processed.',
    };
  }

  // ---------------------------------------------------------------------------
  // Discard
  // ---------------------------------------------------------------------------

  async discardDeadLetterItem(
    dlqItemId: string,
    orgId: string,
  ): Promise<any> {
    const item = await this.getDeadLetterItem(dlqItemId, orgId);

    if (item.status !== DeadLetterStatus.PENDING) {
      throw new BadRequestException(
        `Cannot discard DLQ item with status '${item.status}'. Only 'pending' items can be discarded.`,
      );
    }

    await this.platformService.query(
      `UPDATE dead_letter_queue SET status = $1, updated_at = NOW() WHERE id = $2`,
      [DeadLetterStatus.DISCARDED, dlqItemId],
    );

    this.logger.log(`DLQ item ${dlqItemId} discarded`);
    return { message: 'Dead letter item discarded' };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async getNextExecutionNumber(workflowId: string): Promise<number> {
    const result = await this.platformService.query(
      `SELECT COALESCE(MAX(execution_number), 0) + 1 AS next_number
       FROM workflow_executions WHERE workflow_id = $1`,
      [workflowId],
    );
    return result.rows[0].next_number;
  }
}
