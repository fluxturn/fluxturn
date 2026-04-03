import { api } from '../api';
import type {
  PaymentConfig,
  PaymentConfigFormData,
  PaymentTransaction,
  TransactionFilter,
  PaginatedResponse,
  CreatePaymentIntentParams,
  PaymentIntent,
  ConfirmPaymentParams,
  PaymentResult,
  SubscriptionPlan,
  SubscriptionCheckoutParams,
  RefundRequest,
  RefundResult,
  WebhookEvent,
  WebhookLogFilter,
  SavedPaymentMethod,
} from '../../types/payment';

/**
 * Payment API Client
 * Handles all payment-related API calls including configuration, transactions,
 * subscriptions, refunds, and webhook events
 */
export class PaymentAPI {
  // =============== CONFIGURATION METHODS ===============

  /**
   * Get payment configuration for current context (org/project/app)
   */
  async getConfig(
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<PaymentConfig> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get<PaymentConfig>('/tenant-payment/config');
  }

  /**
   * Create or update payment configuration
   */
  async saveConfig(
    config: PaymentConfigFormData,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<PaymentConfig> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    // Check if config exists
    try {
      const existing = await this.getConfig();
      // Update existing config
      return api.put<PaymentConfig>('/tenant-payment/config', config);
    } catch {
      // Create new config
      return api.post<PaymentConfig>('/tenant-payment/config', config);
    }
  }

  /**
   * Delete payment configuration
   */
  async deleteConfig(
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<void> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.delete('/tenant-payment/config');
  }

  /**
   * Test payment provider configuration
   */
  async testConfig(
    method: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<{ success: boolean; message?: string }> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post(`/tenant-payment/config/test`, { method });
  }

  // =============== PAYMENT INTENT METHODS ===============

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    params: CreatePaymentIntentParams,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<PaymentIntent> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post<PaymentIntent>('/tenant-payment/intent', params);
  }

  /**
   * Confirm a payment intent
   */
  async confirmPayment(
    params: ConfirmPaymentParams,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<PaymentResult> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post<PaymentResult>('/tenant-payment/confirm', params);
  }

  /**
   * Get payment intent details
   */
  async getPaymentIntent(
    intentId: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<PaymentIntent> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get<PaymentIntent>(`/tenant-payment/intent/${intentId}`);
  }

  // =============== TRANSACTION METHODS ===============

  /**
   * Get paginated transaction history
   */
  async getTransactions(
    filter?: TransactionFilter,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<PaginatedResponse<PaymentTransaction>> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const params = new URLSearchParams();
    if (filter?.page) params.append('page', filter.page.toString());
    if (filter?.limit) params.append('limit', filter.limit.toString());
    if (filter?.status) params.append('status', filter.status);
    if (filter?.paymentMethod) params.append('paymentMethod', filter.paymentMethod);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    if (filter?.minAmount) params.append('minAmount', filter.minAmount.toString());
    if (filter?.maxAmount) params.append('maxAmount', filter.maxAmount.toString());
    if (filter?.customerEmail) params.append('customerEmail', filter.customerEmail);

    const query = params.toString();
    return api.get<PaginatedResponse<PaymentTransaction>>(
      `/tenant-payment/transactions${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get single transaction details
   */
  async getTransaction(
    transactionId: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<PaymentTransaction> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get<PaymentTransaction>(`/tenant-payment/transactions/${transactionId}`);
  }

  /**
   * Export transactions
   */
  async exportTransactions(
    filter?: TransactionFilter,
    format: 'csv' | 'json' = 'csv',
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<Blob> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const params = new URLSearchParams();
    params.append('format', format);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.paymentMethod) params.append('paymentMethod', filter.paymentMethod);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    if (filter?.customerEmail) params.append('customerEmail', filter.customerEmail);

    const query = params.toString();
    const response = await fetch(
      `${api.baseURL}/tenant-payment/transactions/export${query ? `?${query}` : ''}`,
      {
        headers: api.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export transactions');
    }

    return response.blob();
  }

  // =============== SUBSCRIPTION METHODS ===============

  /**
   * Get available subscription plans
   */
  async getSubscriptionPlans(
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<SubscriptionPlan[]> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get<SubscriptionPlan[]>('/tenant-payment/subscriptions/plans');
  }

  /**
   * Create subscription checkout session
   */
  async createSubscriptionCheckout(
    params: SubscriptionCheckoutParams,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<{ sessionId: string; url: string }> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post('/tenant-payment/subscriptions/checkout', params);
  }

  /**
   * Get customer's active subscriptions
   */
  async getCustomerSubscriptions(
    customerEmail: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<any[]> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get(`/tenant-payment/subscriptions/customer/${encodeURIComponent(customerEmail)}`);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<void> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.delete(`/tenant-payment/subscriptions/${subscriptionId}`);
  }

  // =============== REFUND METHODS ===============

  /**
   * Process a refund
   */
  async processRefund(
    request: RefundRequest,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<RefundResult> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post<RefundResult>('/tenant-payment/refunds', request);
  }

  /**
   * Get refund details
   */
  async getRefund(
    refundId: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<RefundResult> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get<RefundResult>(`/tenant-payment/refunds/${refundId}`);
  }

  /**
   * Get all refunds for a transaction
   */
  async getTransactionRefunds(
    transactionId: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<RefundResult[]> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get<RefundResult[]>(`/tenant-payment/transactions/${transactionId}/refunds`);
  }

  // =============== WEBHOOK METHODS ===============

  /**
   * Get webhook event logs
   */
  async getWebhookEvents(
    filter?: WebhookLogFilter,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<PaginatedResponse<WebhookEvent>> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const params = new URLSearchParams();
    if (filter?.page) params.append('page', filter.page.toString());
    if (filter?.limit) params.append('limit', filter.limit.toString());
    if (filter?.provider) params.append('provider', filter.provider);
    if (filter?.type) params.append('type', filter.type);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);

    const query = params.toString();
    return api.get<PaginatedResponse<WebhookEvent>>(
      `/tenant-payment/webhooks${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get single webhook event
   */
  async getWebhookEvent(
    eventId: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<WebhookEvent> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get<WebhookEvent>(`/tenant-payment/webhooks/${eventId}`);
  }

  /**
   * Retry failed webhook event
   */
  async retryWebhookEvent(
    eventId: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<void> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post(`/tenant-payment/webhooks/${eventId}/retry`, {});
  }

  // =============== SAVED PAYMENT METHODS ===============

  /**
   * Get customer's saved payment methods
   */
  async getSavedPaymentMethods(
    customerEmail: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<SavedPaymentMethod[]> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get<SavedPaymentMethod[]>(
      `/tenant-payment/payment-methods/${encodeURIComponent(customerEmail)}`
    );
  }

  /**
   * Delete saved payment method
   */
  async deletePaymentMethod(
    paymentMethodId: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<void> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.delete(`/tenant-payment/payment-methods/${paymentMethodId}`);
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    paymentMethodId: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<void> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post('/tenant-payment/payment-methods/set-default', {
      paymentMethodId,
    });
  }
}

// Export singleton instance
export const paymentAPI = new PaymentAPI();
export default paymentAPI;
