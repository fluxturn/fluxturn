import { api } from '../api';

// Type definitions for billing API responses
export interface Subscription {
  id: string;
  plan: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  interval: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  gracePeriodEnd?: string;
  maxProjects: number;
  maxAppsPerProject: number;
  maxTeamMembers: number;
  storageQuotaGB: number;
}

export interface UsageResource {
  resourceType: string;
  used: number;
  limit: number;
}

export interface OrganizationMetrics {
  projects: { used: number; limit: number };
  apps: { used: number; limit: number };
  teamMembers: { used: number; limit: number };
  storage: { used: number; limit: number }; // in bytes
}

export interface UsageData {
  usage: UsageResource[];
  period: {
    start: string;
    end: string;
  };
  organizationMetrics: OrganizationMetrics;
  subscription: {
    plan: string;
    status: string;
  };
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  description?: string;
  createdAt: string;
  hostedInvoiceUrl?: string;
  pdfUrl?: string;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface BillingPortalResponse {
  url: string;
}

export interface WorkflowUsageData {
  aiWorkflowGeneration: {
    used: number;
    limit: number;
    remaining: number;
    period: {
      start: string;
      end: string;
    };
  };
  workflowExecution: {
    used: number;
    limit: number;
    remaining: number;
    period: {
      start: string;
      end: string;
    };
  };
}

export class BillingAPI {
  // Stripe/Billing methods
  async getSubscriptionPlans() {
    return api.request('/stripe/plans');
  }

  async getOrganizationSubscription(organizationId?: string): Promise<Subscription> {
    if (organizationId) api.setOrganizationId(organizationId);
    return api.request<Subscription>(`/stripe/subscription`);
  }

  async createCheckoutSession(data: {
    organizationId: string;
    planId: string;
    interval: 'monthly' | 'yearly';
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResponse> {
    if (data.organizationId) api.setOrganizationId(data.organizationId);
    return api.request<CheckoutSessionResponse>('/stripe/checkout-session', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createBillingPortalSession(data: {
    organizationId: string;
    returnUrl: string;
  }): Promise<BillingPortalResponse> {
    if (data.organizationId) api.setOrganizationId(data.organizationId);
    return api.request<BillingPortalResponse>('/stripe/billing-portal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrganizationUsage(organizationId: string, startDate?: string, endDate?: string): Promise<UsageData> {
    if (organizationId) api.setOrganizationId(organizationId);
    const params = new URLSearchParams({ organizationId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.request<UsageData>(`/stripe/usage?${params.toString()}`);
  }

  async getWorkflowUsage(organizationId?: string): Promise<WorkflowUsageData> {
    if (organizationId) api.setOrganizationId(organizationId);
    return api.request<WorkflowUsageData>(`/stripe/workflow-usage`);
  }

  async getOrganizationInvoices(organizationId: string): Promise<Invoice[]> {
    if (organizationId) api.setOrganizationId(organizationId);
    return api.request<Invoice[]>(`/stripe/invoices`);
  }

  async createSetupIntent(organizationId: string) {
    if (organizationId) api.setOrganizationId(organizationId);
    return api.request('/stripe/setup-intent', {
      method: 'POST',
    });
  }

  async getPaymentMethods(organizationId: string) {
    if (organizationId) api.setOrganizationId(organizationId);
    return api.request(`/stripe/payment-methods`);
  }

  async deletePaymentMethod(paymentMethodId: string, organizationId: string) {
    if (organizationId) api.setOrganizationId(organizationId);
    return api.request(`/stripe/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
    });
  }

  async setDefaultPaymentMethod(data: {
    organizationId: string;
    paymentMethodId: string;
  }) {
    if (data.organizationId) api.setOrganizationId(data.organizationId);
    return api.request('/stripe/payment-methods/set-default', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}


export const billingAPI = new BillingAPI();
export default billingAPI;