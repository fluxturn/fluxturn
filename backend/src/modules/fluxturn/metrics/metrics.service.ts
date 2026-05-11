import { Injectable, Logger } from '@nestjs/common';
import { PlatformService } from '../../database/platform.service';

export type TimeRange = '24h' | '7d' | '30d';

export interface ExecutionMetrics {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  latency: {
    p50: number | null;
    p95: number | null;
    avg: number | null;
  };
  executionsOverTime: Array<{
    bucket: string;
    total: number;
    success: number;
    failed: number;
  }>;
  topFailingWorkflows: Array<{
    workflowId: string;
    workflowName: string;
    failureCount: number;
    totalExecutions: number;
    failureRate: number;
  }>;
  connectorErrorRates: Array<{
    connectorType: string;
    errorCount: number;
    totalExecutions: number;
    errorRate: number;
  }>;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly platformService: PlatformService) {}

  /**
   * Get comprehensive execution metrics for an organization.
   */
  async getExecutionMetrics(
    organizationId: string,
    timeRange: TimeRange = '7d',
  ): Promise<ExecutionMetrics> {
    const interval = this.toInterval(timeRange);
    const groupBy = timeRange === '24h' ? 'hour' : 'day';

    const params = [organizationId];
    const timeFilter = `started_at >= NOW() - INTERVAL '${interval}'`;
    const orgFilter = 'organization_id = $1';
    const whereClause = `${orgFilter} AND ${timeFilter}`;

    const [
      summaryResult,
      latencyResult,
      overTimeResult,
      topFailingResult,
      connectorResult,
    ] = await Promise.all([
      this.querySummary(whereClause, params),
      this.queryLatency(whereClause, params),
      this.queryOverTime(whereClause, params, groupBy),
      this.queryTopFailing(whereClause, params),
      this.queryConnectorErrors(whereClause, params),
    ]);

    const totalExecutions = parseInt(summaryResult.rows[0]?.total || '0', 10);
    const successCount = parseInt(summaryResult.rows[0]?.success || '0', 10);
    const failureCount = parseInt(summaryResult.rows[0]?.failed || '0', 10);
    const successRate =
      totalExecutions > 0
        ? Math.round((successCount / totalExecutions) * 10000) / 100
        : 0;

    return {
      totalExecutions,
      successCount,
      failureCount,
      successRate,
      latency: {
        p50: latencyResult.rows[0]?.p50 != null ? Math.round(latencyResult.rows[0].p50) : null,
        p95: latencyResult.rows[0]?.p95 != null ? Math.round(latencyResult.rows[0].p95) : null,
        avg: latencyResult.rows[0]?.avg != null ? Math.round(latencyResult.rows[0].avg) : null,
      },
      executionsOverTime: overTimeResult.rows.map((r) => ({
        bucket: r.bucket,
        total: parseInt(r.total, 10),
        success: parseInt(r.success, 10),
        failed: parseInt(r.failed, 10),
      })),
      topFailingWorkflows: topFailingResult.rows.map((r) => ({
        workflowId: r.workflow_id,
        workflowName: r.workflow_name || 'Unnamed',
        failureCount: parseInt(r.failure_count, 10),
        totalExecutions: parseInt(r.total_executions, 10),
        failureRate:
          Math.round(
            (parseInt(r.failure_count, 10) / parseInt(r.total_executions, 10)) *
              10000,
          ) / 100,
      })),
      connectorErrorRates: connectorResult.rows.map((r) => ({
        connectorType: r.connector_type,
        errorCount: parseInt(r.error_count, 10),
        totalExecutions: parseInt(r.total_executions, 10),
        errorRate:
          Math.round(
            (parseInt(r.error_count, 10) / parseInt(r.total_executions, 10)) *
              10000,
          ) / 100,
      })),
    };
  }

  // ------------------------------------------------------------------ private

  private toInterval(range: TimeRange): string {
    switch (range) {
      case '24h':
        return '24 hours';
      case '7d':
        return '7 days';
      case '30d':
        return '30 days';
      default:
        return '7 days';
    }
  }

  private querySummary(whereClause: string, params: any[]) {
    return this.platformService.query(
      `SELECT
         COUNT(*)                                       AS total,
         COUNT(*) FILTER (WHERE status = 'completed')   AS success,
         COUNT(*) FILTER (WHERE status = 'failed')      AS failed
       FROM workflow_executions
       WHERE ${whereClause}`,
      params,
    );
  }

  private queryLatency(whereClause: string, params: any[]) {
    return this.platformService.query(
      `SELECT
         PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY duration_ms) AS p50,
         PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95,
         AVG(duration_ms)                                          AS avg
       FROM workflow_executions
       WHERE ${whereClause} AND duration_ms IS NOT NULL`,
      params,
    );
  }

  private queryOverTime(
    whereClause: string,
    params: any[],
    groupBy: 'hour' | 'day',
  ) {
    const trunc = groupBy === 'hour' ? 'hour' : 'day';
    return this.platformService.query(
      `SELECT
         DATE_TRUNC('${trunc}', started_at)::text          AS bucket,
         COUNT(*)                                          AS total,
         COUNT(*) FILTER (WHERE status = 'completed')      AS success,
         COUNT(*) FILTER (WHERE status = 'failed')         AS failed
       FROM workflow_executions
       WHERE ${whereClause}
       GROUP BY bucket
       ORDER BY bucket ASC`,
      params,
    );
  }

  private queryTopFailing(whereClause: string, params: any[]) {
    return this.platformService.query(
      `SELECT
         we.workflow_id,
         w.name                                            AS workflow_name,
         COUNT(*) FILTER (WHERE we.status = 'failed')      AS failure_count,
         COUNT(*)                                          AS total_executions
       FROM workflow_executions we
       LEFT JOIN workflows w ON w.id = we.workflow_id
       WHERE ${whereClause.replace(/\b(organization_id|started_at|status)\b/g, 'we.$1')}
       GROUP BY we.workflow_id, w.name
       HAVING COUNT(*) FILTER (WHERE we.status = 'failed') > 0
       ORDER BY failure_count DESC
       LIMIT 10`,
      params,
    );
  }

  private queryConnectorErrors(whereClause: string, params: any[]) {
    return this.platformService.query(
      `SELECT
         COALESCE(we.trigger_type, 'unknown')              AS connector_type,
         COUNT(*) FILTER (WHERE we.status = 'failed')      AS error_count,
         COUNT(*)                                          AS total_executions
       FROM workflow_executions we
       WHERE ${whereClause.replace(/\b(organization_id|started_at|status)\b/g, 'we.$1')}
       GROUP BY connector_type
       HAVING COUNT(*) FILTER (WHERE we.status = 'failed') > 0
       ORDER BY error_count DESC`,
      params,
    );
  }
}
