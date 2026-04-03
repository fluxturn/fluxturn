import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Res,
  Headers,
  HttpCode,
  UseGuards,
  Query,
  Param,
  BadRequestException,
  RawBodyRequest,
  Request as NestjsRequest,
} from "@nestjs/common";
import { Request, Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StripeService } from "./stripe.service";
import { PlatformService } from "../database/platform.service";
import { WorkflowUsageService } from "../workflows/workflow-usage.service";
import { ApiHeader, ApiTags } from "@nestjs/swagger";

@ApiTags("Stripe")
@Controller("stripe")
export class StripeController {
  constructor(
    private stripeService: StripeService,
    private platformService: PlatformService,
    private workflowUsageService: WorkflowUsageService,
  ) {}

  @Post("webhook-test")
  @HttpCode(200)
  async testWebhook(@Body() body: any) {
    console.log("Test webhook endpoint hit!");
    console.log("Body:", JSON.stringify(body, null, 2));
    return {
      message: "Test webhook received",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("plans")
  async getPlans() {
    return Object.values(this.stripeService.plans);
  }

  @UseGuards(JwtAuthGuard)
  @Get("subscription")
  @ApiHeader({
    name: "x-organization-id",
    description: "Organization ID",
    required: false,
  })
  async getSubscription(
    @NestjsRequest() req: any,
  ) {
    const userId = req.user.userId || req.user.sub;
    let organizationId =
      req.headers["x-organization-id"] || req.auth?.organizationId;

    if (!organizationId) {
      const membership = await this.platformService.findFirstOrganizationMemberByUser(userId);

      if (!membership) {
        throw new BadRequestException("No organization found");
      }

      organizationId = membership.organizationId;
    }

    const member = await this.platformService.findOrganizationMember(userId, organizationId);

    if (!member) {
      throw new BadRequestException("Access denied");
    }

    const subscription = await this.stripeService.getOrganizationSubscription(organizationId);

    // Transform snake_case to camelCase for frontend
    return {
      ...subscription,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      stripeCustomerId: subscription.stripe_customer_id,
      stripeSubscriptionId: subscription.stripe_subscription_id,
      stripePriceId: subscription.stripe_price_id,
      gracePeriodEnd: subscription.grace_period_end,
      maxProjects: subscription.max_projects,
      maxAppsPerProject: subscription.max_apps_per_project,
      maxTeamMembers: subscription.max_team_members,
      storageQuotaGB: subscription.storage_quota_gb,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("workflow-usage")
  @ApiHeader({
    name: "x-organization-id",
    description: "Organization ID",
    required: false,
  })
  async getWorkflowUsage(
    @NestjsRequest() req: any,
  ) {
    const userId = req.user.userId || req.user.sub;
    let organizationId =
      req.headers["x-organization-id"] || req.auth?.organizationId;

    if (!organizationId) {
      const membership = await this.platformService.findFirstOrganizationMemberByUser(userId);

      if (!membership) {
        throw new BadRequestException("No organization found");
      }

      organizationId = membership.organizationId;
    }

    const member = await this.platformService.findOrganizationMember(userId, organizationId);

    if (!member) {
      throw new BadRequestException("Access denied");
    }

    // Get AI workflow generation usage
    const aiWorkflowUsage = await this.workflowUsageService.getWorkflowUsage(organizationId);

    // Get workflow execution usage (from workflow usage service)
    const workflowExecutionUsage = await this.workflowUsageService.getWorkflowExecutionUsage(organizationId);

    return {
      aiWorkflowGeneration: aiWorkflowUsage,
      workflowExecution: workflowExecutionUsage
    };
  }

  private async getWorkflowExecutionCount(organizationId: string, startDate: Date): Promise<number> {
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
      return 0;
    }
  }

  private getWorkflowExecutionLimit(plan: string): number {
    const limits: Record<string, number> = {
      free: 50,
      starter: 5000,
      pro: 50000,
      enterprise: -1, // unlimited
    };
    return limits[plan] || limits.free;
  }

  @UseGuards(JwtAuthGuard)
  @Post("checkout-session")
  async createCheckoutSession(
    @NestjsRequest() req: any,
    @Body()
    body: {
      organizationId: string;
      planId: string;
      interval: "monthly" | "yearly";
      successUrl: string;
      cancelUrl: string;
    }
  ) {
    const userId = req.user.userId || req.user.sub;
    const member = await this.platformService.findOrganizationMember(userId, body.organizationId);

    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new BadRequestException(
        "Only organization admins can manage billing"
      );
    }

    return this.stripeService.createCheckoutSession(
      body.organizationId,
      body.planId,
      body.interval,
      body.successUrl,
      body.cancelUrl
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("billing-portal")
  async createBillingPortal(
    @NestjsRequest() req: any,
    @Body()
    body: {
      organizationId: string;
      returnUrl: string;
    }
  ) {
    const userId = req.user.userId || req.user.sub;
    const member = await this.platformService.findOrganizationMember(userId, body.organizationId);

    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new BadRequestException(
        "Only organization admins can manage billing"
      );
    }

    return this.stripeService.createBillingPortalSession(
      body.organizationId,
      body.returnUrl
    );
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Headers("stripe-signature") signature: string,
    @Req() request: RawBodyRequest<Request>,
    @Res() res: Response
  ) {
    console.log("Webhook endpoint hit!");

    const rawBody = request.rawBody;

    if (!rawBody) {
      console.error("No raw body available");
      throw new BadRequestException("No raw body available");
    }

    try {
      const result = await this.stripeService.handleWebhook(signature, rawBody);
      res.json(result);
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get("usage")
  @ApiHeader({
    name: "x-organization-id",
    description: "Organization ID",
    required: true,
  })
  async getUsage(
    @NestjsRequest() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const organizationId =
      req.headers["x-organization-id"] || req.auth?.organizationId;
    const userId = req.user.userId || req.user.sub;

    const member = await this.platformService.findOrganizationMember(userId, organizationId);

    if (!member) {
      throw new BadRequestException("Access denied");
    }

    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    const usage = await this.platformService.getUsageRecordsByOrganization(organizationId, start, end);
    const subscription =
      await this.stripeService.getOrganizationSubscription(organizationId);
    const orgMetrics = await this.platformService.getOrganizationMetrics(organizationId);

    return {
      period: { start, end },
      usage: usage.map((u) => ({
        resourceType: u.resourceType,
        used: u._sum.quantity || 0,
        limit: this.getResourceLimit(subscription, u.resourceType),
      })),
      organizationMetrics: {
        projects: {
          used: orgMetrics.projectCount,
          limit: subscription.maxProjects,
        },
        apps: {
          used: orgMetrics.appCount,
          limit: subscription.maxAppsPerProject,
        },
        teamMembers: {
          used: orgMetrics.memberCount,
          limit: subscription.maxTeamMembers,
        },
        storage: {
          used: orgMetrics.storageBytes,
          limit: (subscription.storageQuotaGB || 1) * 1024 * 1024 * 1024,
        },
      },
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("invoices")
  @ApiHeader({
    name: "x-organization-id",
    description: "Organization ID",
    required: true,
  })
  async getInvoices(
    @NestjsRequest() req: any,
  ) {
    const organizationId =
      req.headers["x-organization-id"] || req.auth?.organizationId;
    const userId = req.user.userId || req.user.sub;

    const member = await this.platformService.findOrganizationMember(userId, organizationId);

    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new BadRequestException(
        "Only organization admins can view invoices"
      );
    }

    const invoices = await this.platformService.getInvoices(organizationId);

    // Transform snake_case to camelCase for frontend
    return invoices.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      description: invoice.description,
      createdAt: invoice.created_at,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.pdf_url,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Post("setup-intent")
  async createSetupIntent(
    @NestjsRequest() req: any,
    @Body() body: { organizationId: string }
  ) {
    const userId = req.user.userId || req.user.sub;
    const member = await this.platformService.findOrganizationMember(userId, body.organizationId);

    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new BadRequestException(
        "Only organization admins can manage payment methods"
      );
    }

    return this.stripeService.createSetupIntent(body.organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("payment-methods")
  @ApiHeader({
    name: "x-organization-id",
    description: "Organization ID",
    required: true,
  })
  async getPaymentMethods(
    @NestjsRequest() req: any,
  ) {
    const organizationId =
      req.headers["x-organization-id"] || req.auth?.organizationId;
    const userId = req.user.userId || req.user.sub;

    const member = await this.platformService.findOrganizationMember(userId, organizationId);

    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new BadRequestException(
        "Only organization admins can view payment methods"
      );
    }

    return this.stripeService.getPaymentMethods(organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("payment-methods/:paymentMethodId")
  @ApiHeader({
    name: "x-organization-id",
    description: "Organization ID",
    required: true,
  })
  async deletePaymentMethod(
    @NestjsRequest() req: any,
    @Param("paymentMethodId") paymentMethodId: string,
  ) {
    const organizationId =
      req.headers["x-organization-id"] || req.auth?.organizationId;
    const userId = req.user.userId || req.user.sub;

    const member = await this.platformService.findOrganizationMember(userId, organizationId);

    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new BadRequestException(
        "Only organization admins can manage payment methods"
      );
    }

    return this.stripeService.deletePaymentMethod(
      organizationId,
      paymentMethodId
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("payment-methods/set-default")
  async setDefaultPaymentMethod(
    @NestjsRequest() req: any,
    @Body() body: { organizationId: string; paymentMethodId: string }
  ) {
    const userId = req.user.userId || req.user.sub;
    const member = await this.platformService.findOrganizationMember(userId, body.organizationId);

    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new BadRequestException(
        "Only organization admins can manage payment methods"
      );
    }

    return this.stripeService.setDefaultPaymentMethod(
      body.organizationId,
      body.paymentMethodId
    );
  }

  private getResourceLimit(subscription: any, resourceType: string): number {
    switch (resourceType) {
      case "email":
        return subscription.emailQuotaMonthly || 100;
      case "push":
        return subscription.pushQuotaMonthly || 1000;
      case "storage":
        return (subscription.storageQuotaGB || 1) * 1024 * 1024 * 1024;
      default:
        return -1;
    }
  }
}
