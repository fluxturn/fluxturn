import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ITriggerService,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
  TriggerType,
} from '../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../database/platform.service';
import { ConfigService } from '@nestjs/config';

interface PostgreSQLTriggerConfig {
  table?: string;
  triggerOn?: 'insert' | 'update' | 'insert_update';
  timestampColumn?: string;
  pollingInterval?: number;
  columns?: string;
  actionParams?: {
    table?: string;
    triggerOn?: string;
    timestampColumn?: string;
    pollingInterval?: number;
    columns?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  table: string;
  triggerOn: string;
  timestampColumn: string;
  pollingInterval: number;
  columns: string;
  lastPolledAt: Date;
  activatedAt: Date;
}

/**
 * PostgreSQL Trigger Service
 *
 * Manages PostgreSQL polling triggers for workflow automation.
 * Uses timestamp-based polling to detect new or updated rows.
 *
 * Key Features:
 * - Polling-based triggers for INSERT/UPDATE events
 * - Configurable polling intervals
 * - State tracking for last poll timestamp
 * - Workflow restoration on service restart
 */
@Injectable()
export class PostgreSQLTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(PostgreSQLTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing PostgreSQL Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active PostgreSQL workflows from database
   */
  private async restoreActiveWorkflows() {
    try {
      const query = `
        SELECT id, canvas, status
        FROM workflows
        WHERE status = 'active'
        AND canvas IS NOT NULL
      `;

      const result = await this.platformService.query(query);
      let restoredCount = 0;

      for (const row of result.rows) {
        try {
          const canvas = row.canvas;
          const nodes = canvas?.nodes || [];

          // Find PostgreSQL trigger nodes
          const postgresqlTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          node.data?.connectorType === 'postgresql'
          );

          if (postgresqlTriggerNodes.length === 0) {
            continue;
          }

          const workflowId = row.id;
          const triggerNode = postgresqlTriggerNodes[0];
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring PostgreSQL trigger for workflow ${workflowId}`);

          const activationResult = await this.activate(workflowId, triggerConfig);

          if (activationResult.success) {
            restoredCount++;
            this.logger.log(`✅ Restored PostgreSQL trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`❌ Failed to restore workflow ${workflowId}: ${activationResult.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} PostgreSQL workflow(s)`);
      } else {
        this.logger.log('No active PostgreSQL workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate PostgreSQL polling trigger for a workflow
   */
  async activate(workflowId: string, triggerConfig: PostgreSQLTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating PostgreSQL trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract configuration
      const table = triggerConfig.table || triggerConfig.actionParams?.table;
      const triggerOn = triggerConfig.triggerOn || triggerConfig.actionParams?.triggerOn || 'insert';
      const timestampColumn = triggerConfig.timestampColumn || triggerConfig.actionParams?.timestampColumn;
      const pollingInterval = triggerConfig.pollingInterval || triggerConfig.actionParams?.pollingInterval || 60;
      const columns = triggerConfig.columns || triggerConfig.actionParams?.columns || '*';

      if (!table) {
        return {
          success: false,
          message: 'Table name is required for PostgreSQL trigger',
          error: 'Missing table name in trigger configuration',
        };
      }

      if (!timestampColumn) {
        return {
          success: false,
          message: 'Timestamp column is required for PostgreSQL trigger',
          error: 'Missing timestamp column in trigger configuration',
        };
      }

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        table,
        triggerOn,
        timestampColumn,
        pollingInterval,
        columns,
        lastPolledAt: new Date(),
        activatedAt: new Date(),
      });

      this.logger.log(`✅ PostgreSQL trigger activated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'PostgreSQL polling trigger configured successfully',
        data: {
          table,
          triggerOn,
          timestampColumn,
          pollingInterval,
          columns,
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate PostgreSQL trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate PostgreSQL trigger',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Deactivate PostgreSQL trigger for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating PostgreSQL trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        this.logger.warn(`No active PostgreSQL trigger found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'No active PostgreSQL trigger found',
        };
      }

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`✅ PostgreSQL trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'PostgreSQL trigger deactivated successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate PostgreSQL trigger for workflow ${workflowId}:`, error);

      // Still remove from active triggers even if something fails
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate PostgreSQL trigger (removed locally)',
      };
    }
  }

  /**
   * Get status of PostgreSQL trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.POSTGRESQL,
        message: 'PostgreSQL trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.POSTGRESQL,
      message: 'PostgreSQL trigger active',
      metadata: {
        table: trigger.table,
        triggerOn: trigger.triggerOn,
        timestampColumn: trigger.timestampColumn,
        pollingInterval: trigger.pollingInterval,
        columns: trigger.columns,
        lastPolledAt: trigger.lastPolledAt,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  /**
   * Get trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.POSTGRESQL;
  }

  /**
   * Get active trigger info (for polling service)
   */
  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  /**
   * Update last polled timestamp
   */
  updateLastPolled(workflowId: string): void {
    const trigger = this.activeTriggers.get(workflowId);
    if (trigger) {
      trigger.lastPolledAt = new Date();
    }
  }

  /**
   * Get all active triggers (for polling service)
   */
  getAllActiveTriggers(): Map<string, ActiveTrigger> {
    return this.activeTriggers;
  }
}
