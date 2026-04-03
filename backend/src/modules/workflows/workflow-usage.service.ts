import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PlatformService } from '../database/platform.service';

export interface WorkflowUsageLimit {
  used: number;
  limit: number;
  remaining: number;
  period: {
    start: Date;
    end: Date;
  };
}

@Injectable()
export class WorkflowUsageService {
  private readonly logger = new Logger(WorkflowUsageService.name);

  constructor(private platformService: PlatformService) {}

  /**
   * Check and track AI workflow generation
   * Throws error if limit exceeded
   */
  async trackWorkflowGeneration(organizationId: string): Promise<void> {
    try {
      // Get current subscription
      const subscription = await this.platformService.getBillingSubscription(organizationId);

      // Default to free tier if no subscription exists
      const plan = subscription?.plan || 'free';
      const limit = this.getWorkflowGenerationLimit(plan);

      // Check if subscription is expired (only for paid plans)
      if (subscription?.current_period_end && new Date(subscription.current_period_end) < new Date()) {
        throw new BadRequestException(
          'Your subscription has expired. Please renew to continue generating AI workflows.'
        );
      }

      // Calculate monthly usage period (resets monthly regardless of payment frequency)
      // For free tier without subscription, use calendar month
      let currentPeriodStart: Date;
      if (subscription) {
        currentPeriodStart = this.getMonthlyUsagePeriod(subscription).start;
      } else {
        // Free tier without subscription: use start of current calendar month
        const now = new Date();
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Get current usage count
      const count = await this.getGenerationCountForPeriod(organizationId, currentPeriodStart);

      // Check if limit exceeded
      if (limit !== -1 && count >= limit) {
        throw new BadRequestException(
          `AI workflow generation limit exceeded. Your ${plan} plan allows ${limit} AI-generated workflows per month. Please upgrade your plan to continue.`
        );
      }

      this.logger.log(`AI workflow generation tracked for org ${organizationId}. Usage: ${count + 1}/${limit === -1 ? 'Unlimited' : limit}`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error tracking workflow generation: ${error.message}`);
      throw new BadRequestException('Failed to track workflow generation');
    }
  }

  /**
   * Get current AI workflow usage for an organization
   */
  async getWorkflowUsage(organizationId: string): Promise<WorkflowUsageLimit> {
    const subscription = await this.platformService.getBillingSubscription(organizationId);

    // Calculate period - either based on subscription or calendar month for free tier
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;

    if (!subscription) {
      // Free tier without subscription: use calendar month
      const now = new Date();
      currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // Paid subscription: use subscription period
      const period = this.getMonthlyUsagePeriod(subscription);
      currentPeriodStart = period.start;
      currentPeriodEnd = period.end;
    }

    // Actually query the database to get the count (FIX: was returning hardcoded 0 for free tier)
    const used = await this.getGenerationCountForPeriod(organizationId, currentPeriodStart);
    const plan = subscription?.plan || 'free';
    const limit = this.getWorkflowGenerationLimit(plan);

    return {
      used,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - used),
      period: {
        start: currentPeriodStart,
        end: currentPeriodEnd,
      },
    };
  }

  /**
   * Calculate monthly usage period based on subscription anniversary day
   * Usage limits reset monthly regardless of payment frequency (monthly/yearly)
   *
   * Example: If subscription created on Jan 5, 2026:
   * - Jan 5 - Feb 5: First month period
   * - Feb 5 - Mar 5: Second month period
   * - etc.
   */
  private getMonthlyUsagePeriod(subscription: any): { start: Date; end: Date } {
    const now = new Date();

    // Get subscription start date with exact time
    const subscriptionStart = subscription.current_period_start
      ? new Date(subscription.current_period_start)
      : new Date(subscription.created_at || now);

    // Get the anniversary day and time (e.g., Jan 5 at 2:30 PM)
    const anniversaryDay = subscriptionStart.getDate();
    const anniversaryHour = subscriptionStart.getHours();
    const anniversaryMinute = subscriptionStart.getMinutes();
    const anniversarySecond = subscriptionStart.getSeconds();

    // Calculate current month's period with exact time
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Start of current monthly period (anniversary day + time of current month)
    let periodStart = new Date(
      currentYear,
      currentMonth,
      anniversaryDay,
      anniversaryHour,
      anniversaryMinute,
      anniversarySecond
    );

    // If anniversary hasn't happened yet this month, use previous month
    if (periodStart > now) {
      periodStart = new Date(
        currentYear,
        currentMonth - 1,
        anniversaryDay,
        anniversaryHour,
        anniversaryMinute,
        anniversarySecond
      );
    }

    // End of current monthly period (same day + time next month)
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return {
      start: periodStart,
      end: periodEnd,
    };
  }

  /**
   * Get the AI workflow generation limit for a plan
   */
  private getWorkflowGenerationLimit(plan: string): number {
    const limits: Record<string, number> = {
      free: 5,
      starter: 50,
      pro: 200,
      enterprise: -1, // unlimited
    };
    return limits[plan] || limits.free;
  }

  /**
   * Get count of AI-generated workflows for current billing period
   */
  private async getGenerationCountForPeriod(
    organizationId: string,
    startDate: Date
  ): Promise<number> {
    try {
      const result = await this.platformService.query(
        `
        SELECT COUNT(*) as count
        FROM workflows
        WHERE organization_id = $1
          AND is_ai_generated = true
          AND created_at >= $2
        `,
        [organizationId, startDate]
      );

      return parseInt(result.rows[0]?.count || '0', 10);
    } catch (error) {
      this.logger.error(`Error getting generation count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Reset usage for testing purposes (admin only)
   */
  async resetUsageForOrganization(organizationId: string): Promise<void> {
    this.logger.warn(`Resetting AI workflow usage for org ${organizationId}`);

    await this.platformService.query(
      `
      UPDATE workflows
      SET is_ai_generated = false
      WHERE organization_id = $1 AND is_ai_generated = true
      `,
      [organizationId]
    );
  }

  /**
   * Check and track workflow execution
   * Throws error if limit exceeded
   */
  async trackWorkflowExecution(organizationId: string): Promise<void> {
    try {
      // Get current subscription
      const subscription = await this.platformService.getBillingSubscription(organizationId);

      // Default to free tier if no subscription exists
      const plan = subscription?.plan || 'free';
      const limit = this.getWorkflowExecutionLimit(plan);

      // Check if subscription is expired (only for paid plans)
      if (subscription?.current_period_end && new Date(subscription.current_period_end) < new Date()) {
        throw new BadRequestException(
          'Your subscription has expired. Please renew to continue executing workflows.'
        );
      }

      // Calculate monthly usage period
      // For free tier without subscription, use calendar month
      let currentPeriodStart: Date;
      if (subscription) {
        currentPeriodStart = this.getMonthlyUsagePeriod(subscription).start;
      } else {
        // Free tier without subscription: use start of current calendar month
        const now = new Date();
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Get current execution count
      const count = await this.getExecutionCountForPeriod(organizationId, currentPeriodStart);

      // Check if limit exceeded
      if (limit !== -1 && count >= limit) {
        throw new BadRequestException(
          `Workflow execution limit exceeded. Your ${plan} plan allows ${limit} workflow executions per month. Please upgrade your plan to continue.`
        );
      }

      this.logger.log(`Workflow execution tracked for org ${organizationId}. Usage: ${count + 1}/${limit === -1 ? 'Unlimited' : limit}`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error tracking workflow execution: ${error.message}`);
      throw new BadRequestException('Failed to track workflow execution');
    }
  }

  /**
   * Get workflow execution usage for an organization
   */
  async getWorkflowExecutionUsage(organizationId: string): Promise<WorkflowUsageLimit> {
    const subscription = await this.platformService.getBillingSubscription(organizationId);

    // Calculate period - either based on subscription or calendar month for free tier
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;

    if (!subscription) {
      // Free tier without subscription: use calendar month
      const now = new Date();
      currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // Paid subscription: use subscription period
      const period = this.getMonthlyUsagePeriod(subscription);
      currentPeriodStart = period.start;
      currentPeriodEnd = period.end;
    }

    // Actually query the database to get the count (FIX: was returning hardcoded 0 for free tier)
    const used = await this.getExecutionCountForPeriod(organizationId, currentPeriodStart);
    const plan = subscription?.plan || 'free';
    const limit = this.getWorkflowExecutionLimit(plan);

    return {
      used,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - used),
      period: {
        start: currentPeriodStart,
        end: currentPeriodEnd,
      },
    };
  }

  /**
   * Get the workflow execution limit for a plan
   */
  private getWorkflowExecutionLimit(plan: string): number {
    const limits: Record<string, number> = {
      free: 50,
      starter: 5000,
      pro: 50000,
      enterprise: -1, // unlimited
    };
    return limits[plan] || limits.free;
  }

  /**
   * Get count of workflow executions for current period
   */
  private async getExecutionCountForPeriod(
    organizationId: string,
    startDate: Date
  ): Promise<number> {
    try {
      const result = await this.platformService.query(
        `
        SELECT COUNT(*) as count
        FROM workflow_executions
        WHERE organization_id = $1
          AND created_at >= $2
        `,
        [organizationId, startDate]
      );

      return parseInt(result.rows[0]?.count || '0', 10);
    } catch (error) {
      this.logger.error(`Error getting execution count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get usage statistics for all organizations (admin dashboard)
   */
  async getGlobalUsageStats(): Promise<any> {
    try {
      const result = await this.platformService.query(`
        SELECT
          o.id as organization_id,
          o.name as organization_name,
          bs.plan,
          COUNT(w.id) FILTER (WHERE w.is_ai_generated = true AND w.created_at >= bs.current_period_start) as ai_workflows_used,
          bs.current_period_start,
          bs.current_period_end
        FROM organizations o
        LEFT JOIN billing_subscriptions bs ON o.id = bs.organization_id
        LEFT JOIN workflows w ON o.id = w.organization_id
        GROUP BY o.id, o.name, bs.plan, bs.current_period_start, bs.current_period_end
        ORDER BY ai_workflows_used DESC
        LIMIT 100
      `);

      return result.rows.map(row => ({
        organizationId: row.organization_id,
        organizationName: row.organization_name,
        plan: row.plan || 'free',
        aiWorkflowsUsed: parseInt(row.ai_workflows_used || '0', 10),
        limit: this.getWorkflowGenerationLimit(row.plan || 'free'),
        periodStart: row.current_period_start,
        periodEnd: row.current_period_end,
      }));
    } catch (error) {
      this.logger.error(`Error getting global usage stats: ${error.message}`);
      return [];
    }
  }
}
