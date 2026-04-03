// Payment method types
export type PaymentMethodType = 'card' | 'paypal' | 'apple_pay' | 'google_pay';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  requiresSetup?: boolean;
}

export interface CardDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  zipCode?: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  paymentMethod: PaymentMethodType;
  clientSecret?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentConfig {
  id: string;
  organizationId: string;
  projectId?: string;
  appId?: string;

  // Stripe configuration
  stripePublishableKey?: string;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  priceIds?: string[];

  // PayPal configuration
  paypalClientId?: string;
  hasPaypalSecret: boolean;
  paypalMode?: 'sandbox' | 'live';

  // Apple Pay configuration
  applePayMerchantId?: string;
  applePayEnabled: boolean;

  // Google Pay configuration
  googlePayMerchantId?: string;
  googlePayMerchantName?: string;
  googlePayEnabled: boolean;

  // General settings
  enabledPaymentMethods: PaymentMethodType[];
  isActive: boolean;
  currency: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethodType;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface ConfirmPaymentParams {
  paymentIntentId: string;
  paymentMethod: PaymentMethodType;
  paymentDetails?: any;
  savePaymentMethod?: boolean;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  status?: string;
  error?: string;
  redirectUrl?: string;
}

export interface PayPalOrderData {
  id: string;
  status: string;
  payer?: {
    email_address?: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
}

export interface ApplePayPaymentRequest {
  countryCode: string;
  currencyCode: string;
  merchantCapabilities: string[];
  supportedNetworks: string[];
  total: {
    label: string;
    amount: string;
    type?: 'final' | 'pending';
  };
}

export interface GooglePayPaymentRequest {
  apiVersion: number;
  apiVersionMinor: number;
  allowedPaymentMethods: Array<{
    type: string;
    parameters: {
      allowedAuthMethods: string[];
      allowedCardNetworks: string[];
    };
    tokenizationSpecification: {
      type: string;
      parameters: {
        gateway: string;
        gatewayMerchantId: string;
      };
    };
  }>;
  merchantInfo: {
    merchantId: string;
    merchantName: string;
  };
  transactionInfo: {
    totalPriceStatus: string;
    totalPrice: string;
    currencyCode: string;
    countryCode: string;
  };
}

export interface PaymentTransaction {
  id: string;
  organizationId: string;
  projectId?: string;
  appId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: PaymentMethodType;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  metadata?: Record<string, any>;
  stripePaymentIntentId?: string;
  paypalOrderId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedPaymentMethod {
  id: string;
  type: PaymentMethodType;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  email?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface PaymentFormData {
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  description?: string;
  savePaymentMethod?: boolean;
}

export interface PaymentMethodConfig {
  type: PaymentMethodType;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface TenantPaymentConfig {
  organizationId: string;
  projectId?: string;
  appId?: string;
  enabledMethods: PaymentMethodConfig[];
  defaultCurrency: string;
  allowSavePaymentMethods: boolean;
}

// Subscription types
export interface SubscriptionPlan {
  id: string;
  productId: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialDays?: number;
  features: string[];
  metadata?: Record<string, any>;
}

export interface SubscriptionCheckoutParams {
  priceId: string;
  customerEmail?: string;
  customerName?: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  allowPromotionCodes?: boolean;
  metadata?: Record<string, any>;
}

// Refund types
export interface RefundRequest {
  transactionId: string;
  amount?: number; // Partial refund amount, if not provided, full refund
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  reason?: string;
  createdAt: string;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  organizationId: string;
  projectId?: string;
  appId?: string;
  type: string;
  provider: 'stripe' | 'paypal' | 'apple_pay' | 'google_pay';
  data: Record<string, any>;
  status: 'pending' | 'processed' | 'failed';
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  processedAt?: string;
}

export interface WebhookLogFilter {
  provider?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Transaction filter and pagination
export interface TransactionFilter {
  status?: string;
  paymentMethod?: PaymentMethodType;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  customerEmail?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Payment configuration form data
export interface PaymentConfigFormData {
  // Stripe
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  priceIds?: string[];

  // PayPal
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalMode?: 'sandbox' | 'live';

  // Apple Pay
  applePayMerchantId?: string;
  applePayEnabled?: boolean;

  // Google Pay
  googlePayMerchantId?: string;
  googlePayMerchantName?: string;
  googlePayEnabled?: boolean;

  // General
  enabledPaymentMethods?: PaymentMethodType[];
  isActive?: boolean;
  currency?: string;
}
