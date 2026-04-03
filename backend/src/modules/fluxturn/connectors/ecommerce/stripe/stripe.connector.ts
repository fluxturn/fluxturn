import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IEcommerceConnector,
  CreatePaymentRequest,
  PaymentIntent,
  Payment,
  CreateRefundRequest,
  Refund,
  CreateCustomerRequest,
  Customer,
  CreateProductRequest,
  Product,
  CreateSubscriptionRequest,
  Subscription,
  CreateInvoiceRequest,
  Invoice,
  CreateCouponRequest,
  Coupon,
  CreatePayoutRequest,
  Payout,
  Webhook,
  ListRequest,
  ListResponse,
} from '../ecommerce.interface';
import { ConnectorResponse } from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';
import { ErrorUtils } from '../../utils/error.utils';
import { createStripeClient } from '../../config/stripe.config';

@Injectable()
export class StripeConnector implements IEcommerceConnector {
  private readonly logger = new Logger(StripeConnector.name);
  private stripeClient: Stripe;

  constructor(
    private authUtils: AuthUtils,
    private apiUtils: ApiUtils,
    private errorUtils: ErrorUtils
  ) {}

  public initializeWithCredentials(config: any): void {
    const apiKey = config.credentials?.secretKey || config.credentials?.apiKey;
    if (!apiKey) {
      throw new Error('Stripe API key is required');
    }

    this.stripeClient = createStripeClient(apiKey);
  }

  async authorize(request: Request): Promise<ConnectorResponse> {
    try {
      const credentials = await this.authUtils.validateCredentials(
        request,
        ['secretKey', 'apiKey'],
        'Stripe API key is required'
      );

      this.initializeWithCredentials({ credentials });
      
      const account = await this.stripeClient.accounts.retrieve();
      
      return {
        success: true,
        data: {
          authorized: true,
          accountId: account.id,
          accountName: account.settings?.dashboard?.display_name || account.email,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Authorization');
    }
  }

  async createPayment(request: CreatePaymentRequest): Promise<ConnectorResponse<PaymentIntent>> {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.create({
        amount: Math.round(request.amount * 100),
        currency: request.currency,
        customer: request.customerId,
        payment_method: request.paymentMethodId,
        description: request.description,
        metadata: request.metadata,
        confirm: request.confirmationMethod === 'automatic',
        capture_method: request.captureMethod || 'automatic',
      });

      return {
        success: true,
        data: this.transformStripePaymentIntent(paymentIntent),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create payment');
    }
  }

  async capturePayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.capture(paymentId);
      
      return {
        success: true,
        data: this.transformStripePayment(paymentIntent),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Capture payment');
    }
  }

  async cancelPayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.cancel(paymentId);
      
      return {
        success: true,
        data: this.transformStripePayment(paymentIntent),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Cancel payment');
    }
  }

  async getPayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.retrieve(paymentId);
      
      return {
        success: true,
        data: this.transformStripePayment(paymentIntent),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get payment');
    }
  }

  async listPayments(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Payment>>> {
    try {
      const params: Stripe.PaymentIntentListParams = {
        limit: request?.limit || 10,
        starting_after: request?.startingAfter,
        ending_before: request?.endingBefore,
      };

      const paymentIntents = await this.stripeClient.paymentIntents.list(params);
      
      return {
        success: true,
        data: {
          data: paymentIntents.data.map(pi => this.transformStripePayment(pi)),
          hasMore: paymentIntents.has_more,
          nextCursor: paymentIntents.data[paymentIntents.data.length - 1]?.id,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List payments');
    }
  }

  async createRefund(request: CreateRefundRequest): Promise<ConnectorResponse<Refund>> {
    try {
      const refund = await this.stripeClient.refunds.create({
        payment_intent: request.paymentId,
        amount: request.amount ? Math.round(request.amount * 100) : undefined,
        reason: request.reason as Stripe.RefundCreateParams.Reason,
        metadata: request.metadata,
      });

      return {
        success: true,
        data: this.transformStripeRefund(refund),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create refund');
    }
  }

  async getRefund(refundId: string): Promise<ConnectorResponse<Refund>> {
    try {
      const refund = await this.stripeClient.refunds.retrieve(refundId);
      
      return {
        success: true,
        data: this.transformStripeRefund(refund),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get refund');
    }
  }

  async listRefunds(paymentId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Refund>>> {
    try {
      const params: Stripe.RefundListParams = {
        limit: request?.limit || 10,
        starting_after: request?.startingAfter,
        ending_before: request?.endingBefore,
        payment_intent: paymentId,
      };

      const refunds = await this.stripeClient.refunds.list(params);
      
      return {
        success: true,
        data: {
          data: refunds.data.map(r => this.transformStripeRefund(r)),
          hasMore: refunds.has_more,
          nextCursor: refunds.data[refunds.data.length - 1]?.id,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List refunds');
    }
  }

  async createCustomer(request: CreateCustomerRequest): Promise<ConnectorResponse<Customer>> {
    try {
      const customer = await this.stripeClient.customers.create({
        email: request.email,
        name: `${request.firstName} ${request.lastName}`.trim(),
        phone: request.phone,
        address: request.address ? {
          line1: request.address.line1,
          line2: request.address.line2,
          city: request.address.city,
          state: request.address.state,
          postal_code: request.address.postalCode,
          country: request.address.country,
        } : undefined,
        metadata: request.metadata,
      });

      return {
        success: true,
        data: this.transformStripeCustomer(customer as Stripe.Customer),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create customer');
    }
  }

  async getCustomer(customerId: string): Promise<ConnectorResponse<Customer>> {
    try {
      const customer = await this.stripeClient.customers.retrieve(customerId);
      
      if ('deleted' in customer && customer.deleted) {
        throw new Error('Customer has been deleted');
      }

      return {
        success: true,
        data: this.transformStripeCustomer(customer as Stripe.Customer),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get customer');
    }
  }

  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<ConnectorResponse<Customer>> {
    try {
      const updateParams: Stripe.CustomerUpdateParams = {};
      
      if (updates.email) updateParams.email = updates.email;
      if (updates.firstName || updates.lastName) {
        updateParams.name = `${updates.firstName} ${updates.lastName}`.trim();
      }
      if (updates.phone) updateParams.phone = updates.phone;
      if (updates.address) {
        updateParams.address = {
          line1: updates.address.line1,
          line2: updates.address.line2,
          city: updates.address.city,
          state: updates.address.state,
          postal_code: updates.address.postalCode,
          country: updates.address.country,
        };
      }
      if (updates.metadata) updateParams.metadata = updates.metadata;

      const customer = await this.stripeClient.customers.update(customerId, updateParams);

      return {
        success: true,
        data: this.transformStripeCustomer(customer as Stripe.Customer),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Update customer');
    }
  }

  async deleteCustomer(customerId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.stripeClient.customers.del(customerId);
      
      return {
        success: true,
        data: undefined,
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Delete customer');
    }
  }

  async listCustomers(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Customer>>> {
    try {
      const params: Stripe.CustomerListParams = {
        limit: request?.limit || 10,
        starting_after: request?.startingAfter,
        ending_before: request?.endingBefore,
      };

      const customers = await this.stripeClient.customers.list(params);
      
      return {
        success: true,
        data: {
          data: customers.data.map(c => this.transformStripeCustomer(c)),
          hasMore: customers.has_more,
          nextCursor: customers.data[customers.data.length - 1]?.id,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List customers');
    }
  }

  async createProduct(request: CreateProductRequest): Promise<ConnectorResponse<Product>> {
    try {
      const product = await this.stripeClient.products.create({
        name: request.name,
        description: request.description,
        active: request.active,
        images: request.images,
        metadata: request.metadata,
      });

      const price = request.price ? await this.stripeClient.prices.create({
        product: product.id,
        unit_amount: Math.round(request.price * 100),
        currency: request.currency || 'usd',
      }) : null;

      return {
        success: true,
        data: this.transformStripeProduct(product, price),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create product');
    }
  }

  async getProduct(productId: string): Promise<ConnectorResponse<Product>> {
    try {
      const product = await this.stripeClient.products.retrieve(productId);
      const prices = await this.stripeClient.prices.list({ product: productId, limit: 1 });
      
      return {
        success: true,
        data: this.transformStripeProduct(product, prices.data[0]),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get product');
    }
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<ConnectorResponse<Product>> {
    try {
      const updateParams: Stripe.ProductUpdateParams = {};
      
      if (updates.name) updateParams.name = updates.name;
      if (updates.description) updateParams.description = updates.description;
      if (updates.active !== undefined) updateParams.active = updates.active;
      if (updates.images) updateParams.images = updates.images;
      if (updates.metadata) updateParams.metadata = updates.metadata;

      const product = await this.stripeClient.products.update(productId, updateParams);
      const prices = await this.stripeClient.prices.list({ product: productId, limit: 1 });

      return {
        success: true,
        data: this.transformStripeProduct(product, prices.data[0]),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Update product');
    }
  }

  async deleteProduct(productId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.stripeClient.products.update(productId, { active: false });
      
      return {
        success: true,
        data: undefined,
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Delete product');
    }
  }

  async listProducts(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Product>>> {
    try {
      const params: Stripe.ProductListParams = {
        limit: request?.limit || 10,
        starting_after: request?.startingAfter,
        ending_before: request?.endingBefore,
      };

      const products = await this.stripeClient.products.list(params);
      
      return {
        success: true,
        data: {
          data: await Promise.all(products.data.map(async p => {
            const prices = await this.stripeClient.prices.list({ product: p.id, limit: 1 });
            return this.transformStripeProduct(p, prices.data[0]);
          })),
          hasMore: products.has_more,
          nextCursor: products.data[products.data.length - 1]?.id,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List products');
    }
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<ConnectorResponse<Subscription>> {
    try {
      const subscription = await this.stripeClient.subscriptions.create({
        customer: request.customerId,
        items: request.priceId ? [{ price: request.priceId }] : [],
        trial_period_days: request.trialDays,
        metadata: request.metadata,
      });

      return {
        success: true,
        data: this.transformStripeSubscription(subscription),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create subscription');
    }
  }

  async getSubscription(subscriptionId: string): Promise<ConnectorResponse<Subscription>> {
    try {
      const subscription = await this.stripeClient.subscriptions.retrieve(subscriptionId);
      
      return {
        success: true,
        data: this.transformStripeSubscription(subscription),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get subscription');
    }
  }

  async updateSubscription(subscriptionId: string, updates: Partial<Subscription>): Promise<ConnectorResponse<Subscription>> {
    try {
      const updateParams: Stripe.SubscriptionUpdateParams = {};
      
      if (updates.metadata) updateParams.metadata = updates.metadata;

      const subscription = await this.stripeClient.subscriptions.update(subscriptionId, updateParams);

      return {
        success: true,
        data: this.transformStripeSubscription(subscription),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Update subscription');
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<ConnectorResponse<Subscription>> {
    try {
      const subscription = await this.stripeClient.subscriptions.cancel(subscriptionId);
      
      return {
        success: true,
        data: this.transformStripeSubscription(subscription),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Cancel subscription');
    }
  }

  async listSubscriptions(customerId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Subscription>>> {
    try {
      const params: Stripe.SubscriptionListParams = {
        limit: request?.limit || 10,
        starting_after: request?.startingAfter,
        ending_before: request?.endingBefore,
        customer: customerId,
      };

      const subscriptions = await this.stripeClient.subscriptions.list(params);
      
      return {
        success: true,
        data: {
          data: subscriptions.data.map(s => this.transformStripeSubscription(s)),
          hasMore: subscriptions.has_more,
          nextCursor: subscriptions.data[subscriptions.data.length - 1]?.id,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List subscriptions');
    }
  }

  async createInvoice(request: CreateInvoiceRequest): Promise<ConnectorResponse<Invoice>> {
    try {
      const invoice = await this.stripeClient.invoices.create({
        customer: request.customerId,
        subscription: request.subscriptionId,
        description: request.description,
        due_date: request.dueDate ? Math.floor(request.dueDate.getTime() / 1000) : undefined,
        metadata: request.metadata,
      });

      if (request.items) {
        for (const item of request.items) {
          await this.stripeClient.invoiceItems.create({
            customer: request.customerId,
            invoice: invoice.id,
            description: item.description,
            quantity: item.quantity,
            amount: Math.round(item.unitPrice * 100),
            currency: invoice.currency,
          });
        }
      }

      return {
        success: true,
        data: this.transformStripeInvoice(invoice),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create invoice');
    }
  }

  async getInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    try {
      const invoice = await this.stripeClient.invoices.retrieve(invoiceId);
      
      return {
        success: true,
        data: this.transformStripeInvoice(invoice),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get invoice');
    }
  }

  async updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<ConnectorResponse<Invoice>> {
    try {
      const updateParams: Stripe.InvoiceUpdateParams = {};
      
      if (updates.description) updateParams.description = updates.description;
      if (updates.dueDate) updateParams.due_date = Math.floor(updates.dueDate.getTime() / 1000);
      if (updates.metadata) updateParams.metadata = updates.metadata;

      const invoice = await this.stripeClient.invoices.update(invoiceId, updateParams);

      return {
        success: true,
        data: this.transformStripeInvoice(invoice),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Update invoice');
    }
  }

  async deleteInvoice(invoiceId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.stripeClient.invoices.del(invoiceId);
      
      return {
        success: true,
        data: undefined,
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Delete invoice');
    }
  }

  async finalizeInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    try {
      const invoice = await this.stripeClient.invoices.finalizeInvoice(invoiceId);
      
      return {
        success: true,
        data: this.transformStripeInvoice(invoice),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Finalize invoice');
    }
  }

  async payInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    try {
      const invoice = await this.stripeClient.invoices.pay(invoiceId);
      
      return {
        success: true,
        data: this.transformStripeInvoice(invoice),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Pay invoice');
    }
  }

  async listInvoices(customerId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Invoice>>> {
    try {
      const params: Stripe.InvoiceListParams = {
        limit: request?.limit || 10,
        starting_after: request?.startingAfter,
        ending_before: request?.endingBefore,
        customer: customerId,
      };

      const invoices = await this.stripeClient.invoices.list(params);
      
      return {
        success: true,
        data: {
          data: invoices.data.map(i => this.transformStripeInvoice(i)),
          hasMore: invoices.has_more,
          nextCursor: invoices.data[invoices.data.length - 1]?.id,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List invoices');
    }
  }

  async createCoupon(request: CreateCouponRequest): Promise<ConnectorResponse<Coupon>> {
    try {
      const couponParams: Stripe.CouponCreateParams = {
        id: request.code,
        metadata: request.metadata,
      };

      if (request.type === 'percentage') {
        couponParams.percent_off = request.value;
      } else {
        couponParams.amount_off = Math.round(request.value * 100);
        couponParams.currency = request.currency || 'usd';
      }

      if (request.maxUses) couponParams.max_redemptions = request.maxUses;
      
      const coupon = await this.stripeClient.coupons.create(couponParams);

      return {
        success: true,
        data: this.transformStripeCoupon(coupon),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create coupon');
    }
  }

  async getCoupon(couponId: string): Promise<ConnectorResponse<Coupon>> {
    try {
      const coupon = await this.stripeClient.coupons.retrieve(couponId);
      
      return {
        success: true,
        data: this.transformStripeCoupon(coupon),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get coupon');
    }
  }

  async updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<ConnectorResponse<Coupon>> {
    try {
      const updateParams: Stripe.CouponUpdateParams = {};
      
      if (updates.metadata) updateParams.metadata = updates.metadata;

      const coupon = await this.stripeClient.coupons.update(couponId, updateParams);

      return {
        success: true,
        data: this.transformStripeCoupon(coupon),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Update coupon');
    }
  }

  async deleteCoupon(couponId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.stripeClient.coupons.del(couponId);
      
      return {
        success: true,
        data: undefined,
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Delete coupon');
    }
  }

  async listCoupons(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Coupon>>> {
    try {
      const params: Stripe.CouponListParams = {
        limit: request?.limit || 10,
        starting_after: request?.startingAfter,
        ending_before: request?.endingBefore,
      };

      const coupons = await this.stripeClient.coupons.list(params);
      
      return {
        success: true,
        data: {
          data: coupons.data.map(c => this.transformStripeCoupon(c)),
          hasMore: coupons.has_more,
          nextCursor: coupons.data[coupons.data.length - 1]?.id,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List coupons');
    }
  }

  async createPayout(request: CreatePayoutRequest): Promise<ConnectorResponse<Payout>> {
    try {
      const payout = await this.stripeClient.payouts.create({
        amount: Math.round(request.amount * 100),
        currency: request.currency,
        description: request.description,
        metadata: request.metadata,
      });

      return {
        success: true,
        data: this.transformStripePayout(payout),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create payout');
    }
  }

  async getPayout(payoutId: string): Promise<ConnectorResponse<Payout>> {
    try {
      const payout = await this.stripeClient.payouts.retrieve(payoutId);
      
      return {
        success: true,
        data: this.transformStripePayout(payout),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get payout');
    }
  }

  async listPayouts(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Payout>>> {
    try {
      const params: Stripe.PayoutListParams = {
        limit: request?.limit || 10,
        starting_after: request?.startingAfter,
        ending_before: request?.endingBefore,
      };

      const payouts = await this.stripeClient.payouts.list(params);
      
      return {
        success: true,
        data: {
          data: payouts.data.map(p => this.transformStripePayout(p)),
          hasMore: payouts.has_more,
          nextCursor: payouts.data[payouts.data.length - 1]?.id,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List payouts');
    }
  }

  async getBalance(): Promise<ConnectorResponse<{ available: number; pending: number; currency: string }>> {
    try {
      const balance = await this.stripeClient.balance.retrieve();
      
      const available = balance.available[0];
      const pending = balance.pending[0];

      return {
        success: true,
        data: {
          available: available.amount / 100,
          pending: pending.amount / 100,
          currency: available.currency,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get balance');
    }
  }

  async createWebhook(url: string, events: string[]): Promise<ConnectorResponse<Webhook>> {
    try {
      const webhook = await this.stripeClient.webhookEndpoints.create({
        url,
        enabled_events: events as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
      });

      return {
        success: true,
        data: this.transformStripeWebhook(webhook),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create webhook');
    }
  }

  async getWebhook(webhookId: string): Promise<ConnectorResponse<Webhook>> {
    try {
      const webhook = await this.stripeClient.webhookEndpoints.retrieve(webhookId);
      
      return {
        success: true,
        data: this.transformStripeWebhook(webhook),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get webhook');
    }
  }

  async updateWebhook(webhookId: string, updates: Partial<Webhook>): Promise<ConnectorResponse<Webhook>> {
    try {
      const updateParams: Stripe.WebhookEndpointUpdateParams = {};
      
      if (updates.url) updateParams.url = updates.url;
      if (updates.events) updateParams.enabled_events = updates.events as Stripe.WebhookEndpointUpdateParams.EnabledEvent[];
      if (updates.active !== undefined) updateParams.disabled = !updates.active;

      const webhook = await this.stripeClient.webhookEndpoints.update(webhookId, updateParams);

      return {
        success: true,
        data: this.transformStripeWebhook(webhook),
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Update webhook');
    }
  }

  async deleteWebhook(webhookId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.stripeClient.webhookEndpoints.del(webhookId);
      
      return {
        success: true,
        data: undefined,
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Delete webhook');
    }
  }

  async listWebhooks(): Promise<ConnectorResponse<ListResponse<Webhook>>> {
    try {
      const webhooks = await this.stripeClient.webhookEndpoints.list({ limit: 100 });
      
      return {
        success: true,
        data: {
          data: webhooks.data.map(w => this.transformStripeWebhook(w)),
          hasMore: webhooks.has_more,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List webhooks');
    }
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      this.stripeClient.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      return false;
    }
  }

  async createPrice(productId: string, amount: number, currency: string, billingCycle: string): Promise<ConnectorResponse<any>> {
    try {
      const recurringInterval = this.mapBillingCycleToStripe(billingCycle);
      
      const price = await this.stripeClient.prices.create({
        product: productId,
        unit_amount: Math.round(amount * 100),
        currency,
        recurring: recurringInterval ? { interval: recurringInterval } : undefined,
      });

      return {
        success: true,
        data: price,
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create price');
    }
  }

  async getPrice(priceId: string): Promise<ConnectorResponse<any>> {
    try {
      const price = await this.stripeClient.prices.retrieve(priceId);
      
      return {
        success: true,
        data: price,
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get price');
    }
  }

  async updatePrice(priceId: string, updates: any): Promise<ConnectorResponse<any>> {
    try {
      const price = await this.stripeClient.prices.update(priceId, updates);
      
      return {
        success: true,
        data: price,
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Update price');
    }
  }

  async listPrices(productId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<any>>> {
    try {
      const params: Stripe.PriceListParams = {
        limit: request?.limit || 10,
        starting_after: request?.startingAfter,
        ending_before: request?.endingBefore,
        product: productId,
      };

      const prices = await this.stripeClient.prices.list(params);
      
      return {
        success: true,
        data: {
          data: prices.data,
          hasMore: prices.has_more,
          nextCursor: prices.data[prices.data.length - 1]?.id,
        },
        metadata: { connectorId: 'stripe' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List prices');
    }
  }

  private transformStripePaymentIntent(paymentIntent: Stripe.PaymentIntent): PaymentIntent {
    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      paymentMethodId: paymentIntent.payment_method as string,
      customerId: paymentIntent.customer as string,
      description: paymentIntent.description || undefined,
      metadata: paymentIntent.metadata,
      status: this.mapStripeStatus(paymentIntent.status),
      clientSecret: paymentIntent.client_secret || undefined,
      createdAt: new Date(paymentIntent.created * 1000),
    };
  }

  private transformStripePayment(paymentIntent: Stripe.PaymentIntent): Payment {
    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: this.mapStripePaymentStatus(paymentIntent.status),
      customerId: paymentIntent.customer as string,
      description: paymentIntent.description || undefined,
      metadata: paymentIntent.metadata,
      createdAt: new Date(paymentIntent.created * 1000),
    };
  }

  private transformStripeRefund(refund: Stripe.Refund): Refund {
    return {
      id: refund.id,
      paymentId: refund.payment_intent as string,
      amount: refund.amount / 100,
      currency: refund.currency,
      reason: refund.reason || undefined,
      status: this.mapStripeRefundStatus(refund.status || 'succeeded'),
      metadata: refund.metadata,
      createdAt: new Date(refund.created * 1000),
    };
  }

  private transformStripeCustomer(customer: Stripe.Customer): Customer {
    const name = customer.name?.split(' ') || [];
    return {
      id: customer.id,
      email: customer.email || '',
      firstName: name[0],
      lastName: name.slice(1).join(' '),
      phone: customer.phone || undefined,
      address: customer.address ? {
        line1: customer.address.line1 || '',
        line2: customer.address.line2 || undefined,
        city: customer.address.city || '',
        state: customer.address.state || undefined,
        postalCode: customer.address.postal_code || '',
        country: customer.address.country || '',
      } : undefined,
      metadata: customer.metadata,
      createdAt: new Date(customer.created * 1000),
    };
  }

  private transformStripeProduct(product: Stripe.Product, price?: Stripe.Price | null): Product {
    return {
      id: product.id,
      name: product.name,
      description: product.description || undefined,
      price: price ? price.unit_amount! / 100 : 0,
      currency: price?.currency || 'usd',
      images: product.images,
      active: product.active,
      metadata: product.metadata,
      createdAt: new Date(product.created * 1000),
      updatedAt: new Date(product.updated * 1000),
    };
  }

  private transformStripeSubscription(subscription: Stripe.Subscription): Subscription {
    const item = subscription.items.data[0];
    const price = item?.price;
    
    return {
      id: subscription.id,
      customerId: subscription.customer as string,
      priceId: price?.id,
      status: this.mapStripeSubscriptionStatus(subscription.status),
      billingCycle: this.mapStripeInterval(price?.recurring?.interval || 'month'),
      amount: price?.unit_amount ? price.unit_amount / 100 : 0,
      currency: price?.currency || 'usd',
      startDate: new Date(subscription.start_date * 1000),
      endDate: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : undefined,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      metadata: subscription.metadata,
      createdAt: new Date(subscription.created * 1000),
    };
  }

  private transformStripeInvoice(invoice: Stripe.Invoice): Invoice {
    return {
      id: invoice.id,
      customerId: invoice.customer as string,
      subscriptionId: (invoice as any).subscription as string | undefined,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      status: this.mapStripeInvoiceStatus(invoice.status || 'draft'),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
      description: invoice.description || undefined,
      metadata: invoice.metadata,
      createdAt: new Date(invoice.created * 1000),
    };
  }

  private transformStripeCoupon(coupon: Stripe.Coupon): Coupon {
    return {
      id: coupon.id,
      code: coupon.id,
      type: coupon.percent_off ? 'percentage' : 'fixed_amount',
      value: coupon.percent_off || (coupon.amount_off ? coupon.amount_off / 100 : 0),
      currency: coupon.currency || undefined,
      maxUses: coupon.max_redemptions || undefined,
      usedCount: coupon.times_redeemed,
      validUntil: coupon.redeem_by ? new Date(coupon.redeem_by * 1000) : undefined,
      active: coupon.valid,
      metadata: coupon.metadata,
    };
  }

  private transformStripePayout(payout: Stripe.Payout): Payout {
    return {
      id: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency,
      status: this.mapStripePayoutStatus(payout.status),
      description: payout.description || undefined,
      metadata: payout.metadata,
      createdAt: new Date(payout.created * 1000),
    };
  }

  private transformStripeWebhook(webhook: Stripe.WebhookEndpoint): Webhook {
    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.enabled_events,
      active: webhook.status === 'enabled',
      secret: webhook.secret || undefined,
      createdAt: new Date(webhook.created * 1000),
    };
  }

  private mapStripeStatus(status: string): 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' {
    switch (status) {
      case 'requires_payment_method':
      case 'requires_confirmation':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'succeeded':
        return 'succeeded';
      case 'canceled':
        return 'canceled';
      default:
        return 'failed';
    }
  }

  private mapStripePaymentStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded' {
    switch (status) {
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'succeeded':
        return 'completed';
      case 'canceled':
        return 'failed';
      default:
        return 'failed';
    }
  }

  private mapStripeRefundStatus(status: string): 'pending' | 'succeeded' | 'failed' {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'succeeded':
        return 'succeeded';
      case 'failed':
      case 'canceled':
        return 'failed';
      default:
        return 'succeeded';
    }
  }

  private mapStripeSubscriptionStatus(status: string): 'active' | 'inactive' | 'canceled' | 'past_due' | 'unpaid' {
    switch (status) {
      case 'active':
        return 'active';
      case 'canceled':
        return 'canceled';
      case 'past_due':
        return 'past_due';
      case 'unpaid':
      case 'incomplete':
      case 'incomplete_expired':
        return 'unpaid';
      case 'paused':
      case 'trialing':
      default:
        return 'inactive';
    }
  }

  private mapStripeInvoiceStatus(status: string): 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' {
    switch (status) {
      case 'draft':
        return 'draft';
      case 'open':
        return 'open';
      case 'paid':
        return 'paid';
      case 'void':
        return 'void';
      case 'uncollectible':
        return 'uncollectible';
      default:
        return 'draft';
    }
  }

  private mapStripePayoutStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'canceled' {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'in_transit':
        return 'processing';
      case 'paid':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'canceled':
        return 'canceled';
      default:
        return 'pending';
    }
  }

  private mapStripeInterval(interval: string): 'monthly' | 'yearly' | 'weekly' | 'daily' {
    switch (interval) {
      case 'month':
        return 'monthly';
      case 'year':
        return 'yearly';
      case 'week':
        return 'weekly';
      case 'day':
        return 'daily';
      default:
        return 'monthly';
    }
  }

  private mapBillingCycleToStripe(cycle: string): Stripe.PriceCreateParams.Recurring.Interval | null {
    switch (cycle) {
      case 'monthly':
        return 'month';
      case 'yearly':
        return 'year';
      case 'weekly':
        return 'week';
      case 'daily':
        return 'day';
      default:
        return null;
    }
  }
}