/**
 * Centralized Stripe Configuration
 *
 * Manages Stripe API version and other Stripe-specific settings
 * across all Stripe connectors and services.
 */

import Stripe from 'stripe';

/**
 * Stripe API Version
 * Update this when you want to use a different Stripe API version
 * across the entire application.
 */
export const STRIPE_API_VERSION = '2025-10-29.clover' as Stripe.LatestApiVersion;

/**
 * Stripe Client Configuration
 * Default options for initializing Stripe clients
 */
export const STRIPE_CLIENT_CONFIG: Stripe.StripeConfig = {
  apiVersion: STRIPE_API_VERSION,
  typescript: true,
};

/**
 * Create a Stripe client instance with centralized configuration
 *
 * @param apiKey - Stripe API key (secret key)
 * @param customConfig - Optional custom configuration to override defaults
 * @returns Configured Stripe client instance
 */
export function createStripeClient(
  apiKey: string,
  customConfig?: Partial<Stripe.StripeConfig>
): Stripe {
  return new Stripe(apiKey, {
    ...STRIPE_CLIENT_CONFIG,
    ...customConfig,
  });
}

/**
 * Common Stripe webhook events
 * Used as defaults when no specific events are configured
 */
export const DEFAULT_STRIPE_WEBHOOK_EVENTS = [
  'charge.succeeded',
  'charge.failed',
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'payment_intent.succeeded',
  'payment_intent.failed',
] as const;

/**
 * All supported Stripe webhook event types
 */
export const SUPPORTED_STRIPE_WEBHOOK_EVENTS = [
  'charge.succeeded',
  'charge.failed',
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'payment_intent.succeeded',
  'payment_intent.failed',
  'payment_method.attached',
  'payment_method.detached',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'subscription.created',
  'subscription.updated',
  'subscription.deleted',
] as const;
