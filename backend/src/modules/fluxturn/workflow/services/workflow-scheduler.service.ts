import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PlatformService } from '../../../database/platform.service';
import { ScheduleTriggerService } from './triggers/schedule-trigger.service';

/**
 * WorkflowSchedulerService
 *
 * Responsible for bootstrapping cron jobs on application startup.
 * On init it queries the database for all active workflows that contain
 * a SCHEDULE_TRIGGER node, then delegates to ScheduleTriggerService to
 * register the actual CronJob for each one.
 *
 * It also exposes helpers for re-registering / removing cron jobs when
 * workflows are updated or deleted at runtime.
 *
 * Closes #120
 */
@Injectable()
export class WorkflowSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowSchedulerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => ScheduleTriggerService))
    private readonly scheduleTriggerService: ScheduleTriggerService,
  ) {}

  /**
   * Called by NestJS after the module is fully initialised.
   * Loads every active workflow with a schedule trigger from the DB
   * and registers a cron job for each.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing WorkflowSchedulerService -- loading active schedule triggers...');

    try {
      const workflows = await this.loadScheduledWorkflows();

      if (workflows.length === 0) {
        this.logger.log('No active scheduled workflows found');
        return;
      }

      this.logger.log(`Found ${workflows.length} active scheduled workflow(s), registering cron jobs...`);

      let successCount = 0;
      let failCount = 0;

      for (const workflow of workflows) {
        try {
          const scheduleTriggerNode = this.findScheduleTriggerNode(workflow.canvas);

          if (!scheduleTriggerNode) {
            this.logger.warn(
              `Workflow ${workflow.id} (${workflow.name}) is flagged active but has no SCHEDULE_TRIGGER node -- skipping`,
            );
            continue;
          }

          const result = await this.scheduleTriggerService.activate(
            workflow.id,
            scheduleTriggerNode.data,
          );

          if (result.success) {
            successCount++;
            this.logger.log(
              `Registered cron for workflow "${workflow.name}" (${workflow.id}) -- ` +
              `next: ${result.data?.nextExecution ?? 'unknown'}`,
            );
          } else {
            failCount++;
            this.logger.warn(
              `Failed to register cron for workflow "${workflow.name}" (${workflow.id}): ${result.message}`,
            );
          }
        } catch (err: any) {
          failCount++;
          this.logger.error(
            `Error registering cron for workflow "${workflow.name}" (${workflow.id}): ${err.message}`,
          );
        }
      }

      this.logger.log(
        `Cron registration complete: ${successCount} succeeded, ${failCount} failed`,
      );
    } catch (err: any) {
      // Non-fatal -- the app should still start even if we can't load schedules
      this.logger.error(`Failed to bootstrap scheduled workflows: ${err.message}`, err.stack);
    }
  }

  /**
   * On module destroy, deactivate all running cron jobs.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down WorkflowSchedulerService -- stopping all cron jobs');

    const activeSchedules = this.scheduleTriggerService.getActiveSchedules();

    for (const schedule of activeSchedules) {
      try {
        await this.scheduleTriggerService.deactivate(schedule.workflowId);
      } catch (err: any) {
        this.logger.error(
          `Error stopping cron for workflow ${schedule.workflowId}: ${err.message}`,
        );
      }
    }

    this.logger.log('All cron jobs stopped');
  }

  // -------------------------------------------------------------------
  //  Public helpers for runtime changes
  // -------------------------------------------------------------------

  /**
   * Re-register (or register for the first time) the cron job for a
   * workflow that was just created or updated.
   * Safe to call even if the workflow has no schedule trigger -- it will
   * simply deactivate any existing job and return.
   */
  async registerWorkflow(workflowId: string): Promise<void> {
    this.logger.log(`Registering/updating cron for workflow ${workflowId}`);

    try {
      const query = `SELECT id, name, canvas FROM workflows WHERE id = $1`;
      const result = await this.platformService.query(query, [workflowId]);

      if (result.rows.length === 0) {
        this.logger.warn(`Workflow ${workflowId} not found in database`);
        return;
      }

      const workflow = result.rows[0];
      const scheduleTriggerNode = this.findScheduleTriggerNode(workflow.canvas);

      if (!scheduleTriggerNode) {
        // Workflow has no schedule trigger -- make sure any old job is removed
        await this.scheduleTriggerService.deactivate(workflowId);
        return;
      }

      await this.scheduleTriggerService.activate(workflowId, scheduleTriggerNode.data);
    } catch (err: any) {
      this.logger.error(`Failed to register cron for workflow ${workflowId}: ${err.message}`);
    }
  }

  /**
   * Remove the cron job for a workflow that was deleted or deactivated.
   */
  async unregisterWorkflow(workflowId: string): Promise<void> {
    this.logger.log(`Unregistering cron for workflow ${workflowId}`);
    await this.scheduleTriggerService.deactivate(workflowId);
  }

  // -------------------------------------------------------------------
  //  Private helpers
  // -------------------------------------------------------------------

  /**
   * Query the database for all workflows that are 'active' and have a
   * canvas containing at least one SCHEDULE_TRIGGER node.
   *
   * We use a JSONB containment check (the @> operator) so Postgres does
   * the heavy lifting instead of fetching every workflow.
   */
  private async loadScheduledWorkflows(): Promise<
    Array<{ id: string; name: string; canvas: any }>
  > {
    const query = `
      SELECT id, name, canvas
      FROM workflows
      WHERE status = 'active'
        AND canvas IS NOT NULL
        AND canvas -> 'nodes' @> '[{"type": "SCHEDULE_TRIGGER"}]'
    `;

    const result = await this.platformService.query(query);
    return result.rows;
  }

  /**
   * Find the first SCHEDULE_TRIGGER node inside a workflow canvas.
   */
  private findScheduleTriggerNode(canvas: any): any | null {
    if (!canvas || !canvas.nodes || !Array.isArray(canvas.nodes)) {
      return null;
    }

    return canvas.nodes.find((node: any) => node.type === 'SCHEDULE_TRIGGER') ?? null;
  }
}
