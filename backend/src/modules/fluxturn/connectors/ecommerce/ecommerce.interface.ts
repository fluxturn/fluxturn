import { Request } from 'express';
import { ConnectorResponse } from '../types';

// Common E-commerce Types
export interface Customer {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: Address;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface Product {
  id?: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  sku?: string;
  inventory?: number;
  images?: string[];
  category?: string;
  active?: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentMethod {
  id?: string;
  type: 'card' | 'bank_transfer' | 'paypal' | 'apple_pay' | 'google_pay' | 'other';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}

export interface PaymentIntent {
  id?: string;
  amount: number;
  currency: string;
  paymentMethodId?: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, any>;
  status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  clientSecret?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Payment {
  id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  paymentMethod?: PaymentMethod;
  customerId?: string;
  orderId?: string;
  description?: string;
  metadata?: Record<string, any>;
  fees?: number;
  refundedAmount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Refund {
  id?: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason?: string;
  status?: 'pending' | 'succeeded' | 'failed';
  metadata?: Record<string, any>;
  createdAt?: Date;
}

export interface Subscription {
  id?: string;
  customerId: string;
  productId?: string;
  priceId?: string;
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'unpaid';
  billingCycle: 'monthly' | 'yearly' | 'weekly' | 'daily';
  amount: number;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  trialEnd?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Invoice {
  id?: string;
  customerId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate?: Date;
  description?: string;
  items?: InvoiceItem[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productId?: string;
}

export interface Order {
  id?: string;
  customerId?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  items: OrderItem[];
  subtotal: number;
  tax?: number;
  shipping?: number;
  total: number;
  currency: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress?: Address;
  billingAddress?: Address;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderItem {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
}

export interface Coupon {
  id?: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  currency?: string;
  description?: string;
  maxUses?: number;
  usedCount?: number;
  validFrom?: Date;
  validUntil?: Date;
  active?: boolean;
  metadata?: Record<string, any>;
}

export interface Discount {
  id?: string;
  couponId: string;
  customerId?: string;
  orderId?: string;
  amount: number;
  currency: string;
  appliedAt?: Date;
}

export interface Inventory {
  productId: string;
  sku?: string;
  quantity: number;
  lowStockThreshold?: number;
  trackQuantity?: boolean;
  allowBackorder?: boolean;
  location?: string;
}

export interface Payout {
  id?: string;
  amount: number;
  currency: string;
  recipientId?: string;
  recipientEmail?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';
  description?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Webhook {
  id?: string;
  url: string;
  events: string[];
  active?: boolean;
  secret?: string;
  headers?: Record<string, string>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  livemode?: boolean;
  pendingWebhooks?: number;
}

// Request/Response interfaces
export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  paymentMethodId?: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, any>;
  confirmationMethod?: 'automatic' | 'manual';
  captureMethod?: 'automatic' | 'manual';
}

export interface CreateCustomerRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: Address;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionRequest {
  customerId: string;
  productId?: string;
  priceId?: string;
  billingCycle: 'monthly' | 'yearly' | 'weekly' | 'daily';
  amount?: number;
  currency?: string;
  trialDays?: number;
  metadata?: Record<string, any>;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  sku?: string;
  inventory?: number;
  images?: string[];
  category?: string;
  active?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateInvoiceRequest {
  customerId: string;
  subscriptionId?: string;
  items?: InvoiceItem[];
  dueDate?: Date;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateRefundRequest {
  paymentId: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface CreateCouponRequest {
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  currency?: string;
  description?: string;
  maxUses?: number;
  validFrom?: Date;
  validUntil?: Date;
  metadata?: Record<string, any>;
}

export interface CreateOrderRequest {
  customerId?: string;
  items: OrderItem[];
  shippingAddress?: Address;
  billingAddress?: Address;
  metadata?: Record<string, any>;
}

export interface UpdateInventoryRequest {
  productId: string;
  sku?: string;
  quantity: number;
  operation?: 'set' | 'increment' | 'decrement';
}

export interface CreatePayoutRequest {
  amount: number;
  currency: string;
  recipientId?: string;
  recipientEmail?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ListRequest {
  limit?: number;
  offset?: number;
  startingAfter?: string;
  endingBefore?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListResponse<T> {
  data: T[];
  hasMore: boolean;
  totalCount?: number;
  nextCursor?: string;
  prevCursor?: string;
}

// Main E-commerce Connector Interface
export interface IEcommerceConnector {
  // Payment Operations
  createPayment(request: CreatePaymentRequest): Promise<ConnectorResponse<PaymentIntent>>;
  capturePayment(paymentId: string): Promise<ConnectorResponse<Payment>>;
  cancelPayment(paymentId: string): Promise<ConnectorResponse<Payment>>;
  getPayment(paymentId: string): Promise<ConnectorResponse<Payment>>;
  listPayments(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Payment>>>;
  
  // Refund Operations
  createRefund(request: CreateRefundRequest): Promise<ConnectorResponse<Refund>>;
  getRefund(refundId: string): Promise<ConnectorResponse<Refund>>;
  listRefunds(paymentId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Refund>>>;
  
  // Customer Operations
  createCustomer(request: CreateCustomerRequest): Promise<ConnectorResponse<Customer>>;
  getCustomer(customerId: string): Promise<ConnectorResponse<Customer>>;
  updateCustomer(customerId: string, updates: Partial<Customer>): Promise<ConnectorResponse<Customer>>;
  deleteCustomer(customerId: string): Promise<ConnectorResponse<void>>;
  listCustomers(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Customer>>>;
  
  // Product Operations
  createProduct(request: CreateProductRequest): Promise<ConnectorResponse<Product>>;
  getProduct(productId: string): Promise<ConnectorResponse<Product>>;
  updateProduct(productId: string, updates: Partial<Product>): Promise<ConnectorResponse<Product>>;
  deleteProduct(productId: string): Promise<ConnectorResponse<void>>;
  listProducts(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Product>>>;
  
  // Subscription Operations
  createSubscription(request: CreateSubscriptionRequest): Promise<ConnectorResponse<Subscription>>;
  getSubscription(subscriptionId: string): Promise<ConnectorResponse<Subscription>>;
  updateSubscription(subscriptionId: string, updates: Partial<Subscription>): Promise<ConnectorResponse<Subscription>>;
  cancelSubscription(subscriptionId: string): Promise<ConnectorResponse<Subscription>>;
  listSubscriptions(customerId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Subscription>>>;
  
  // Invoice Operations
  createInvoice(request: CreateInvoiceRequest): Promise<ConnectorResponse<Invoice>>;
  getInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>>;
  updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<ConnectorResponse<Invoice>>;
  deleteInvoice(invoiceId: string): Promise<ConnectorResponse<void>>;
  finalizeInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>>;
  payInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>>;
  listInvoices(customerId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Invoice>>>;
  
  // Order Operations (for e-commerce platforms)
  createOrder?(request: CreateOrderRequest): Promise<ConnectorResponse<Order>>;
  getOrder?(orderId: string): Promise<ConnectorResponse<Order>>;
  updateOrder?(orderId: string, updates: Partial<Order>): Promise<ConnectorResponse<Order>>;
  cancelOrder?(orderId: string): Promise<ConnectorResponse<Order>>;
  fulfillOrder?(orderId: string, trackingNumber?: string): Promise<ConnectorResponse<Order>>;
  listOrders?(customerId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Order>>>;
  
  // Inventory Operations (for e-commerce platforms)
  updateInventory?(request: UpdateInventoryRequest): Promise<ConnectorResponse<Inventory>>;
  getInventory?(productId: string): Promise<ConnectorResponse<Inventory>>;
  listInventory?(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Inventory>>>;
  
  // Coupon/Discount Operations
  createCoupon?(request: CreateCouponRequest): Promise<ConnectorResponse<Coupon>>;
  getCoupon?(couponId: string): Promise<ConnectorResponse<Coupon>>;
  updateCoupon?(couponId: string, updates: Partial<Coupon>): Promise<ConnectorResponse<Coupon>>;
  deleteCoupon?(couponId: string): Promise<ConnectorResponse<void>>;
  listCoupons?(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Coupon>>>;
  
  // Payout Operations (for payment processors)
  createPayout?(request: CreatePayoutRequest): Promise<ConnectorResponse<Payout>>;
  getPayout?(payoutId: string): Promise<ConnectorResponse<Payout>>;
  listPayouts?(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Payout>>>;
  
  // Balance Operations (for payment processors)
  getBalance?(): Promise<ConnectorResponse<{ available: number; pending: number; currency: string }>>;
  
  // Webhook Operations
  createWebhook?(url: string, events: string[]): Promise<ConnectorResponse<Webhook>>;
  getWebhook?(webhookId: string): Promise<ConnectorResponse<Webhook>>;
  updateWebhook?(webhookId: string, updates: Partial<Webhook>): Promise<ConnectorResponse<Webhook>>;
  deleteWebhook?(webhookId: string): Promise<ConnectorResponse<void>>;
  listWebhooks?(): Promise<ConnectorResponse<ListResponse<Webhook>>>;
  verifyWebhookSignature?(payload: string, signature: string, secret: string): boolean;
  
  // Price/Pricing Operations (for subscription-based platforms)
  createPrice?(productId: string, amount: number, currency: string, billingCycle: string): Promise<ConnectorResponse<any>>;
  getPrice?(priceId: string): Promise<ConnectorResponse<any>>;
  updatePrice?(priceId: string, updates: any): Promise<ConnectorResponse<any>>;
  listPrices?(productId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<any>>>;
  
  // Category Operations (for e-commerce platforms)
  createCategory?(name: string, description?: string, parentId?: string): Promise<ConnectorResponse<any>>;
  getCategory?(categoryId: string): Promise<ConnectorResponse<any>>;
  updateCategory?(categoryId: string, updates: any): Promise<ConnectorResponse<any>>;
  deleteCategory?(categoryId: string): Promise<ConnectorResponse<void>>;
  listCategories?(request?: ListRequest): Promise<ConnectorResponse<ListResponse<any>>>;
  
  // Collection Operations (for e-commerce platforms like Shopify)
  createCollection?(name: string, description?: string, products?: string[]): Promise<ConnectorResponse<any>>;
  getCollection?(collectionId: string): Promise<ConnectorResponse<any>>;
  updateCollection?(collectionId: string, updates: any): Promise<ConnectorResponse<any>>;
  deleteCollection?(collectionId: string): Promise<ConnectorResponse<void>>;
  listCollections?(request?: ListRequest): Promise<ConnectorResponse<ListResponse<any>>>;
}