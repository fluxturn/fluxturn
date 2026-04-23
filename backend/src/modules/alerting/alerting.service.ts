import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../database/platform.service';
import { EmailService } from '../email/email.service';
import {
  CreateAlertConfigDto,
  UpdateAlertConfigDto,
  AlertChannel,
} from './dto/alert-config.dto';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);

  constructor(
    private readonly platformService: PlatformService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create the alert_configurations table if it does not exist
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.platformService.query(`
        CREATE TABLE IF NOT EXISTS alert_configurations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL,
          channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'webhook', 'slack')),
          config JSONB NOT NULL DEFAULT '{}',
          conditions JSONB NOT NULL DEFAULT '{"onEveryFailure": true}',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      this.logger.log('alert_configurations table ensured');
    } catch (error) {
      this.logger.error('Failed to create alert_configurations table', error);
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async configureAlerts(
    orgId: string,
    dto: CreateAlertConfigDto,
  ): Promise<any> {
    const id = uuidv4();
    const result = await this.platformService.query(
      `INSERT INTO alert_configurations
        (id, organization_id, channel, config, conditions, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        id,
        orgId,
        dto.channel,
        JSON.stringify(dto.config),
        JSON.stringify(dto.conditions || { onEveryFailure: true }),
        dto.is_active !== false,
      ],
    );
    return result.rows[0];
  }

  async getAlertConfigs(orgId: string): Promise<any[]> {
    const result = await this.platformService.query(
      `SELECT * FROM alert_configurations
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [orgId],
    );
    return result.rows;
  }

  async getAlertConfigById(id: string, orgId: string): Promise<any> {
    const result = await this.platformService.query(
      `SELECT * FROM alert_configurations WHERE id = $1 AND organization_id = $2`,
      [id, orgId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Alert configuration not found');
    }
    return result.rows[0];
  }

  async updateAlertConfig(
    id: string,
    orgId: string,
    dto: UpdateAlertConfigDto,
  ): Promise<any> {
    // Verify existence
    await this.getAlertConfigById(id, orgId);

    const sets: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (dto.channel !== undefined) {
      sets.push(`channel = $${paramIdx++}`);
      values.push(dto.channel);
    }
    if (dto.config !== undefined) {
      sets.push(`config = $${paramIdx++}`);
      values.push(JSON.stringify(dto.config));
    }
    if (dto.conditions !== undefined) {
      sets.push(`conditions = $${paramIdx++}`);
      values.push(JSON.stringify(dto.conditions));
    }
    if (dto.is_active !== undefined) {
      sets.push(`is_active = $${paramIdx++}`);
      values.push(dto.is_active);
    }

    sets.push(`updated_at = NOW()`);

    values.push(id);
    values.push(orgId);

    const result = await this.platformService.query(
      `UPDATE alert_configurations
       SET ${sets.join(', ')}
       WHERE id = $${paramIdx++} AND organization_id = $${paramIdx}
       RETURNING *`,
      values,
    );
    return result.rows[0];
  }

  async deleteAlertConfig(id: string, orgId: string): Promise<void> {
    await this.getAlertConfigById(id, orgId);
    await this.platformService.query(
      `DELETE FROM alert_configurations WHERE id = $1 AND organization_id = $2`,
      [id, orgId],
    );
  }

  // ---------------------------------------------------------------------------
  // Alert dispatch
  // ---------------------------------------------------------------------------

  /**
   * Called when a workflow execution fails.
   * Looks up alert configs for the workflow's organization and dispatches
   * alerts to every active, matching channel.
   */
  async sendAlert(
    workflowId: string,
    executionId: string,
    error: { message: string; stack?: string },
    meta?: {
      workflowName?: string;
      organizationId?: string;
      failedNodeId?: string;
      failedNodeName?: string;
    },
  ): Promise<void> {
    const orgId = meta?.organizationId;
    if (!orgId) {
      this.logger.warn('sendAlert called without organizationId; skipping');
      return;
    }

    try {
      const configs = await this.getAlertConfigs(orgId);
      const activeConfigs = configs.filter((c) => c.is_active);

      if (activeConfigs.length === 0) {
        return;
      }

      for (const cfg of activeConfigs) {
        try {
          const shouldAlert = await this.evaluateConditions(
            cfg.conditions,
            workflowId,
            orgId,
          );
          if (!shouldAlert) continue;

          switch (cfg.channel as AlertChannel) {
            case AlertChannel.EMAIL:
              await this.sendEmailAlert(cfg.config, workflowId, executionId, error, meta);
              break;
            case AlertChannel.WEBHOOK:
              await this.sendWebhookAlert(cfg.config, workflowId, executionId, error, meta);
              break;
            case AlertChannel.SLACK:
              await this.sendSlackAlert(cfg.config, workflowId, executionId, error, meta);
              break;
          }
        } catch (channelError) {
          this.logger.error(
            `Failed to send alert via ${cfg.channel} (config ${cfg.id}): ${channelError.message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`sendAlert failed: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Condition evaluation
  // ---------------------------------------------------------------------------

  private async evaluateConditions(
    conditions: any,
    workflowId: string,
    orgId: string,
  ): Promise<boolean> {
    if (!conditions) return true;

    // Default: alert on every failure
    if (conditions.onEveryFailure !== false) return true;

    // Error-rate threshold
    if (conditions.errorRateThreshold != null) {
      const windowMinutes = conditions.errorRateWindowMinutes || 60;
      const result = await this.platformService.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'failed') AS failed,
           COUNT(*) AS total
         FROM workflow_executions
         WHERE workflow_id = $1
           AND organization_id = $2
           AND created_at >= NOW() - INTERVAL '1 minute' * $3`,
        [workflowId, orgId, windowMinutes],
      );
      const row = result.rows[0];
      const total = parseInt(row.total, 10);
      if (total === 0) return true;
      const rate = parseInt(row.failed, 10) / total;
      return rate >= conditions.errorRateThreshold;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Channel implementations
  // ---------------------------------------------------------------------------

  private async sendEmailAlert(
    config: any,
    workflowId: string,
    executionId: string,
    error: { message: string; stack?: string },
    meta?: any,
  ): Promise<void> {
    if (!config?.email) {
      this.logger.warn('Email alert config missing email address');
      return;
    }

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const detailsLink = `${appUrl}/workflows/${workflowId}/executions/${executionId}`;

    await this.emailService.sendEmail({
      to: config.email,
      subject: `[FluxTurn] Workflow execution failed: ${meta?.workflowName || workflowId}`,
      html: `
        <h2>Workflow Execution Failed</h2>
        <table style="border-collapse:collapse;">
          <tr><td style="padding:4px 12px;font-weight:bold;">Workflow</td><td style="padding:4px 12px;">${meta?.workflowName || workflowId}</td></tr>
          <tr><td style="padding:4px 12px;font-weight:bold;">Execution ID</td><td style="padding:4px 12px;">${executionId}</td></tr>
          <tr><td style="padding:4px 12px;font-weight:bold;">Failed Node</td><td style="padding:4px 12px;">${meta?.failedNodeName || 'N/A'}</td></tr>
          <tr><td style="padding:4px 12px;font-weight:bold;">Error</td><td style="padding:4px 12px;">${error.message}</td></tr>
          <tr><td style="padding:4px 12px;font-weight:bold;">Timestamp</td><td style="padding:4px 12px;">${new Date().toISOString()}</td></tr>
        </table>
        <p><a href="${detailsLink}">View Execution Details</a></p>
      `,
      text: `Workflow "${meta?.workflowName || workflowId}" failed.\nExecution: ${executionId}\nError: ${error.message}\nDetails: ${detailsLink}`,
      skipLogging: true,
    });

    this.logger.log(`Email alert sent to ${config.email} for execution ${executionId}`);
  }

  private async sendWebhookAlert(
    config: any,
    workflowId: string,
    executionId: string,
    error: { message: string; stack?: string },
    meta?: any,
  ): Promise<void> {
    if (!config?.url) {
      this.logger.warn('Webhook alert config missing URL');
      return;
    }

    const payload = {
      event: 'workflow.execution.failed',
      workflow_id: workflowId,
      workflow_name: meta?.workflowName || null,
      execution_id: executionId,
      failed_node_id: meta?.failedNodeId || null,
      failed_node_name: meta?.failedNodeName || null,
      error: {
        message: error.message,
        stack: error.stack || null,
      },
      timestamp: new Date().toISOString(),
    };

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.webhookSecret) {
      const signature = crypto
        .createHmac('sha256', config.webhookSecret)
        .update(body)
        .digest('hex');
      headers['X-FluxTurn-Signature'] = `sha256=${signature}`;
    }

    await axios.post(config.url, body, { headers, timeout: 10000 });
    this.logger.log(`Webhook alert sent to ${config.url} for execution ${executionId}`);
  }

  private async sendSlackAlert(
    config: any,
    workflowId: string,
    executionId: string,
    error: { message: string; stack?: string },
    meta?: any,
  ): Promise<void> {
    if (!config?.slackWebhookUrl) {
      this.logger.warn('Slack alert config missing slackWebhookUrl');
      return;
    }

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const detailsLink = `${appUrl}/workflows/${workflowId}/executions/${executionId}`;

    const slackPayload = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Workflow Execution Failed',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Workflow:*\n${meta?.workflowName || workflowId}` },
            { type: 'mrkdwn', text: `*Execution:*\n\`${executionId}\`` },
            { type: 'mrkdwn', text: `*Failed Node:*\n${meta?.failedNodeName || 'N/A'}` },
            { type: 'mrkdwn', text: `*Time:*\n${new Date().toISOString()}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error:*\n\`\`\`${error.message}\`\`\``,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Details' },
              url: detailsLink,
            },
          ],
        },
      ],
    };

    await axios.post(config.slackWebhookUrl, slackPayload, { timeout: 10000 });
    this.logger.log(`Slack alert sent for execution ${executionId}`);
  }
}
