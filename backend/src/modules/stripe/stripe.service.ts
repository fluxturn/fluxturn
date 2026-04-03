import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../database/platform.service';
import Stripe from 'stripe';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  priceIdMonthly: string;
  priceIdYearly: string;
  limits: {
    maxProjects: number;
    maxAppsPerProject: number;
    maxTeamMembers: number;
    emailQuotaMonthly: number;
    pushQuotaMonthly: number;
    storageQuotaGB: number;
    aiWorkflowGenerations: number; // AI-powered workflow generation limit
    workflowExecutions: number; // Workflow execution limit
  };
  features: {
    hasCustomDomain: boolean;
    hasAdvancedAnalytics: boolean;
    hasPrioritySupport: boolean;
    hasApiAccess: boolean;
    hasExportFeature: boolean;
    hasCollaboration: boolean;
    hasVectorDatabase: boolean;
    hasWorkflowAutomation: boolean;
    hasRealtimeSync: boolean;
  };
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  readonly plans: Record<string, SubscriptionPlan>;

  constructor(
    private configService: ConfigService,
    private platformService: PlatformService,
  ) {
    this.stripe = new Stripe(
      this.configService.get('STRIPE_SECRET_KEY') || '',
      {
        apiVersion: '2025-10-29.clover',
      },
    );

    this.plans = {
      free: {
        id: 'free',
        name: 'Free',
        description: 'Perfect for trying out Fluxturn',
        priceMonthly: 0,
        priceYearly: 0,
        priceIdMonthly: '',
        priceIdYearly: '',
        limits: {
          maxProjects: 2,
          maxAppsPerProject: 2,
          maxTeamMembers: 2,
          emailQuotaMonthly: 100,
          pushQuotaMonthly: 500,
          storageQuotaGB: 0.5,
          aiWorkflowGenerations: 5, // 5 AI workflow generations per month
          workflowExecutions: 50, // 50 workflow executions per month
        },
        features: {
          hasCustomDomain: false,
          hasAdvancedAnalytics: false,
          hasPrioritySupport: false,
          hasApiAccess: true,
          hasExportFeature: false,
          hasCollaboration: false,
          hasVectorDatabase: true,
          hasWorkflowAutomation: true,
          hasRealtimeSync: false,
        },
      },
      starter: {
        id: 'starter',
        name: 'Starter',
        description: 'Great for small teams and individual projects',
        priceMonthly: 9.99,
        priceYearly: 99.99,
        priceIdMonthly:
          this.configService.get('STRIPE_PRICE_STARTER_MONTHLY') || '',
        priceIdYearly:
          this.configService.get('STRIPE_PRICE_STARTER_YEARLY') || '',
        limits: {
          maxProjects: 5,
          maxAppsPerProject: 5,
          maxTeamMembers: 5,
          emailQuotaMonthly: 1000,
          pushQuotaMonthly: 5000,
          storageQuotaGB: 2,
          aiWorkflowGenerations: 50, // 50 AI workflow generations per month
          workflowExecutions: 5000, // 5,000 workflow executions per month
        },
        features: {
          hasCustomDomain: true,
          hasAdvancedAnalytics: false,
          hasPrioritySupport: false,
          hasApiAccess: true,
          hasExportFeature: true,
          hasCollaboration: true,
          hasVectorDatabase: true,
          hasWorkflowAutomation: true,
          hasRealtimeSync: true,
        },
      },
      pro: {
        id: 'pro',
        name: 'Professional',
        description: 'For professionals and growing teams',
        priceMonthly: 19.99,
        priceYearly: 199.99,
        priceIdMonthly:
          this.configService.get('STRIPE_PRICE_PRO_MONTHLY') || '',
        priceIdYearly: this.configService.get('STRIPE_PRICE_PRO_YEARLY') || '',
        limits: {
          maxProjects: 15,
          maxAppsPerProject: 15,
          maxTeamMembers: 20,
          emailQuotaMonthly: 10000,
          pushQuotaMonthly: 50000,
          storageQuotaGB: 5,
          aiWorkflowGenerations: 200, // 200 AI workflow generations per month
          workflowExecutions: 50000, // 50,000 workflow executions per month
        },
        features: {
          hasCustomDomain: true,
          hasAdvancedAnalytics: true,
          hasPrioritySupport: true,
          hasApiAccess: true,
          hasExportFeature: true,
          hasCollaboration: true,
          hasVectorDatabase: true,
          hasWorkflowAutomation: true,
          hasRealtimeSync: true,
        },
      },
      enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'For large organizations with advanced needs',
        priceMonthly: 49.99,
        priceYearly: 499.99,
        priceIdMonthly:
          this.configService.get('STRIPE_PRICE_ENTERPRISE_MONTHLY') || '',
        priceIdYearly:
          this.configService.get('STRIPE_PRICE_ENTERPRISE_YEARLY') || '',
        limits: {
          maxProjects: 40,
          maxAppsPerProject: 40,
          maxTeamMembers: -1,
          emailQuotaMonthly: 100000,
          pushQuotaMonthly: 1000000,
          storageQuotaGB: 20,
          aiWorkflowGenerations: -1, // Unlimited AI workflow generations
          workflowExecutions: -1, // Unlimited workflow executions
        },
        features: {
          hasCustomDomain: true,
          hasAdvancedAnalytics: true,
          hasPrioritySupport: true,
          hasApiAccess: true,
          hasExportFeature: true,
          hasCollaboration: true,
          hasVectorDatabase: true,
          hasWorkflowAutomation: true,
          hasRealtimeSync: true,
        },
      },
    };
  }

  async createCheckoutSession(
    organizationId: string,
    planId: string,
    interval: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string,
  ) {
    try {
      const organization = await this.platformService.getOrganizationById(organizationId);
      const subscription = await this.platformService.getBillingSubscription(organizationId);

      if (!organization) {
        throw new Error('Organization not found');
      }

      const plan = this.plans[planId];
      if (!plan) {
        throw new Error('Invalid plan');
      }

      const priceId =
        interval === 'monthly' ? plan.priceIdMonthly : plan.priceIdYearly;

      let customerId = subscription?.stripeCustomerId || subscription?.stripe_customer_id;

      if (!customerId) {
        const customer = await this.stripe.customers.create({
          name: organization.name,
          metadata: {
            organizationId,
          },
        });
        customerId = customer.id;
      } else {
        await this.stripe.customers.update(customerId, {
          metadata: {
            organizationId,
          },
        });
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          organizationId,
          planId,
        },
      });

      return session;
    } catch (error) {
      this.logger.error('Failed to create checkout session:', error);
      throw error;
    }
  }

  async createBillingPortalSession(organizationId: string, returnUrl: string) {
    try {
      const subscription = await this.platformService.getBillingSubscription(organizationId);

      if (!subscription || !(subscription.stripeCustomerId || subscription.stripe_customer_id)) {
        throw new Error('No subscription found');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId || subscription.stripe_customer_id,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      this.logger.error('Failed to create billing portal session:', error);
      throw error;
    }
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    try {
      this.logger.log('Webhook received');

      const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');

      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      this.logger.log(`Event constructed: ${event.type} (${event.id})`);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;

        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook error:', error);
      throw error;
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    const organizationId = session.metadata?.organizationId;
    const planId = session.metadata?.planId;

    if (!organizationId || !planId) {
      this.logger.error('Missing metadata in checkout session');
      return;
    }

    const plan = this.plans[planId];

    if (!session.subscription) {
      if (session.mode === 'subscription' || planId) {
        const currentPeriodStart = new Date();
        const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const billingData = {
          organizationId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: null,
          stripePriceId: null,
          plan: planId,
          status: 'active',
          interval: 'monthly',
          currentPeriodStart,
          currentPeriodEnd,
          ...plan.limits,
          ...plan.features,
        };

        await this.platformService.upsertBillingSubscription(organizationId, billingData);
        await this.platformService.updateOrganization(organizationId, { plan: planId });
      }
      return;
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    try {
      // Get period from subscription items (not root level)
      const subscriptionItem = subscription.items.data[0];
      const periodStart = subscriptionItem?.current_period_start;
      const periodEnd = subscriptionItem?.current_period_end;

      const currentPeriodStart = periodStart
        ? new Date(periodStart * 1000)
        : new Date();
      const currentPeriodEnd = periodEnd
        ? new Date(periodEnd * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const billingData = {
        organizationId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        plan: planId,
        status: subscription.status,
        interval: subscription.items.data[0].price.recurring?.interval,
        currentPeriodStart,
        currentPeriodEnd,
        ...plan.limits,
        ...plan.features,
      };

      await this.platformService.upsertBillingSubscription(organizationId, billingData);
      await this.platformService.updateOrganization(organizationId, { plan: planId });
      await this.updateQuotasForOrganization(
        organizationId,
        plan.limits.emailQuotaMonthly,
      );
    } catch (error) {
      this.logger.error('Error processing checkout session:', error);
      throw error;
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const customer = await this.stripe.customers.retrieve(
      subscription.customer as string,
    );

    const organizationId = (customer as Stripe.Customer).metadata
      ?.organizationId;
    if (!organizationId) {
      this.logger.error('No organizationId in customer metadata');
      return;
    }

    const priceId = subscription.items.data[0].price.id;
    const planId = this.getPlanIdFromPriceId(priceId);
    const plan = this.plans[planId];

    // Get period from subscription items (not root level)
    const subscriptionItem = subscription.items.data[0];
    const periodStart = subscriptionItem?.current_period_start;
    const periodEnd = subscriptionItem?.current_period_end;

    const currentPeriodStart = periodStart
      ? new Date(periodStart * 1000)
      : new Date();
    const currentPeriodEnd = periodEnd
      ? new Date(periodEnd * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const billingData = {
      organizationId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan: planId,
      status: subscription.status,
      interval: subscription.items.data[0].price.recurring?.interval,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      ...plan.limits,
      ...plan.features,
    };

    await this.platformService.upsertBillingSubscription(organizationId, billingData);
    await this.platformService.updateOrganization(organizationId, { plan: planId });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customer = await this.stripe.customers.retrieve(
      subscription.customer as string,
    );

    const organizationId = (customer as Stripe.Customer).metadata
      ?.organizationId;
    if (!organizationId) {
      this.logger.error('No organizationId in customer metadata');
      return;
    }

    const freePlan = this.plans.free;

    await this.platformService.updateBillingSubscription(organizationId, {
      stripeSubscriptionId: null,
      stripePriceId: null,
      plan: 'free',
      status: 'canceled',
      ...freePlan.limits,
      ...freePlan.features,
    });

    await this.platformService.updateOrganization(organizationId, { plan: 'free' });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    try {
      // Get organization ID from customer metadata
      const customer = await this.stripe.customers.retrieve(
        invoice.customer as string,
      );
      const organizationId = (customer as Stripe.Customer).metadata?.organizationId;

      if (!organizationId) {
        this.logger.warn(`No organizationId found for invoice ${invoice.id}`);
        return;
      }

      // Verify organization exists before inserting invoice
      const orgExists = await this.platformService.getOrganizationById(organizationId);
      if (!orgExists) {
        this.logger.warn(`Organization ${organizationId} not found, skipping invoice ${invoice.id}`);
        return;
      }

      // Get subscription to determine plan name for description
      const subscription = await this.platformService.getBillingSubscription(organizationId);
      const planName = this.plans[subscription?.plan]?.name || 'Subscription';
      const interval = subscription?.interval === 'year' ? 'Yearly' : 'Monthly';

      await this.platformService.createInvoice({
        organizationId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        description: `${planName} Plan - ${interval}`,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        paidAt: new Date(),
        hostedInvoiceUrl: invoice.hosted_invoice_url || null,
        pdfUrl: invoice.invoice_pdf || null,
        metadata: {
          stripeCustomerId: invoice.customer as string,
          planName: subscription?.plan,
        },
      });

      this.logger.log(`✅ Invoice ${invoice.id} saved for org ${organizationId}`);
    } catch (error) {
      this.logger.error(`Error handling invoice paid: ${error}`);
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const customer = await this.stripe.customers.retrieve(
      invoice.customer as string,
    );

    const organizationId = (customer as Stripe.Customer).metadata
      ?.organizationId;

    if (organizationId) {
      const subscription = await this.platformService.getBillingSubscription(organizationId);

      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

      await this.platformService.updateBillingSubscription(organizationId, {
        status: 'past_due',
        gracePeriodEnd,
        previousPlan: subscription?.plan,
      });

      await this.sendGracePeriodNotification(organizationId, gracePeriodEnd);
    }
  }

  private async sendGracePeriodNotification(
    organizationId: string,
    gracePeriodEnd: Date,
  ) {
    try {
      const admins = await this.platformService.getOrganizationMembers(organizationId, ['owner', 'admin']);
      this.logger.warn(
        `Organization ${organizationId} entered grace period until ${gracePeriodEnd}`,
      );
    } catch (error) {
      this.logger.error('Failed to send grace period notification:', error);
    }
  }

  private getPlanIdFromPriceId(priceId: string): string {
    for (const [planId, plan] of Object.entries(this.plans)) {
      if (plan.priceIdMonthly === priceId || plan.priceIdYearly === priceId) {
        return planId;
      }
    }
    return 'free';
  }

  private async updateQuotasForOrganization(
    organizationId: string,
    emailQuota: number,
  ) {
    console.log(
      `Organization ${organizationId} email quota updated to ${emailQuota} via subscription`,
    );
  }

  async getOrganizationSubscription(organizationId: string) {
    const subscription = await this.platformService.getBillingSubscription(organizationId);

    if (!subscription) {
      return {
        ...this.plans.free,
        ...this.plans.free.limits,
        ...this.plans.free.features,
        status: 'active',
        plan: 'free',
        gracePeriodEnd: null,
      };
    }

    const normalizedInterval = subscription.interval === 'month'
      ? 'monthly'
      : subscription.interval === 'year'
        ? 'yearly'
        : subscription.interval;

    return {
      ...subscription,
      interval: normalizedInterval,
      ...this.plans[subscription.plan].limits,
      ...this.plans[subscription.plan].features,
    };
  }

  async createSetupIntent(organizationId: string) {
    try {
      const subscription = await this.platformService.getBillingSubscription(organizationId);

      let customerId = subscription?.stripeCustomerId;

      if (!customerId) {
        const organization = await this.platformService.getOrganizationById(organizationId);

        const customer = await this.stripe.customers.create({
          metadata: {
            organizationId,
          },
          name: organization?.name,
        });

        customerId = customer.id;

        if (subscription) {
          await this.platformService.updateBillingSubscription(organizationId, {
            stripeCustomerId: customerId,
          });
        }
      }

      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata: {
          organizationId,
        },
      });

      return { clientSecret: setupIntent.client_secret };
    } catch (error) {
      this.logger.error('Failed to create setup intent:', error);
      throw error;
    }
  }

  async getPaymentMethods(organizationId: string) {
    try {
      const subscription = await this.platformService.getBillingSubscription(organizationId);

      if (!(subscription?.stripeCustomerId || subscription?.stripe_customer_id)) {
        return [];
      }

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: subscription.stripeCustomerId || subscription.stripe_customer_id,
        type: 'card',
      });

      const customer = (await this.stripe.customers.retrieve(
        subscription.stripeCustomerId || subscription.stripe_customer_id,
      )) as Stripe.Customer;

      const defaultPaymentMethodId =
        customer.invoice_settings?.default_payment_method;

      return paymentMethods.data.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            }
          : undefined,
        isDefault: pm.id === defaultPaymentMethodId,
      }));
    } catch (error) {
      this.logger.error('Failed to get payment methods:', error);
      throw error;
    }
  }

  async deletePaymentMethod(organizationId: string, paymentMethodId: string) {
    try {
      const subscription = await this.platformService.getBillingSubscription(organizationId);

      if (!(subscription?.stripeCustomerId || subscription?.stripe_customer_id)) {
        throw new Error('No customer found');
      }

      const paymentMethod =
        await this.stripe.paymentMethods.retrieve(paymentMethodId);

      if (paymentMethod.customer !== (subscription.stripeCustomerId || subscription.stripe_customer_id)) {
        throw new Error('Payment method does not belong to this organization');
      }

      await this.stripe.paymentMethods.detach(paymentMethodId);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to delete payment method:', error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(
    organizationId: string,
    paymentMethodId: string,
  ) {
    try {
      const subscription = await this.platformService.getBillingSubscription(organizationId);

      if (!(subscription?.stripeCustomerId || subscription?.stripe_customer_id)) {
        throw new Error('No customer found');
      }

      await this.stripe.customers.update(subscription.stripeCustomerId || subscription.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      if (subscription.stripeSubscriptionId || subscription.stripe_subscription_id) {
        await this.stripe.subscriptions.update(
          subscription.stripeSubscriptionId || subscription.stripe_subscription_id,
          {
            default_payment_method: paymentMethodId,
          },
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to set default payment method:', error);
      throw error;
    }
  }
}
