// Ecommerce Connectors - Category Index

// Export connector implementations
export { GumroadConnector } from './gumroad';
export { MagentoConnector } from './magento';
export { PaddleConnector } from './paddle';
export { PayPalConnector } from './paypal';
export { ShopifyConnector } from './shopify';
export { StripeConnector } from './stripe';
export { StripeV2Connector } from './stripe-v2';
export { WooCommerceConnector } from './woocommerce';

// Export connector definitions
export { GUMROAD_CONNECTOR } from './gumroad';
export { MAGENTO_CONNECTOR } from './magento';
export { PADDLE_CONNECTOR } from './paddle';
export { PAYPAL_CONNECTOR } from './paypal';
export { SHOPIFY_CONNECTOR } from './shopify';
export { STRIPE_CONNECTOR } from './stripe';
export { STRIPE_V2_CONNECTOR } from './stripe-v2';
export { WOOCOMMERCE_CONNECTOR } from './woocommerce';

// Combined array
import { GUMROAD_CONNECTOR } from './gumroad';
import { MAGENTO_CONNECTOR } from './magento';
import { PADDLE_CONNECTOR } from './paddle';
import { PAYPAL_CONNECTOR } from './paypal';
import { SHOPIFY_CONNECTOR } from './shopify';
import { STRIPE_CONNECTOR } from './stripe';
import { STRIPE_V2_CONNECTOR } from './stripe-v2';
import { WOOCOMMERCE_CONNECTOR } from './woocommerce';

export const ECOMMERCE_CONNECTORS = [
  GUMROAD_CONNECTOR,
  MAGENTO_CONNECTOR,
  PADDLE_CONNECTOR,
  PAYPAL_CONNECTOR,
  SHOPIFY_CONNECTOR,
  STRIPE_CONNECTOR,
  STRIPE_V2_CONNECTOR,
  WOOCOMMERCE_CONNECTOR,
];
