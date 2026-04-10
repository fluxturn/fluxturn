import { api } from '../api';

// Types based on backend DTOs
export interface SendEmailDto {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export interface SendTemplatedEmailDto {
  templateName: string;
  to: string | string[];
  templateData: Record<string, unknown>;
  from?: string;
}

export interface QueueEmailDto extends SendEmailDto {
  queueUrl?: string;
  delay?: number;
}

export interface BulkEmailDto {
  recipients: BulkEmailRecipient[];
  templateName: string;
  commonData?: Record<string, unknown>;
  batchSize?: number;
}

export interface BulkEmailRecipient {
  email: string;
  data?: Record<string, unknown>;
}

export interface VerifyEmailDto {
  email: string;
}

export interface CreateEmailTemplateDto {
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
  variables: string[];
  category?: string;
  description?: string;
  previewText?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  thumbnail?: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  templateId: string;
  recipientListId?: string;
  segmentId?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  scheduledAt?: string;
  sentAt?: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openCount: number;
  clickCount: number;
  unsubscribeCount: number;
  bounceCount: number;
  complaintCount: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  bounceRate: number;
  complaintRate: number;
  createdAt: string;
  updatedAt: string;
  isAbTest?: boolean;
  abTestConfig?: {
    variants: Array<{
      id: string;
      name: string;
      subject?: string;
      templateId: string;
      percentage: number;
    }>;
    winner?: string;
    testDuration: number;
  };
}

export interface EmailMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplaints: number;
  totalUnsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  recentActivity: Array<{
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complaints: number;
  }>;
}

export interface EmailLog {
  id: string;
  campaignId?: string;
  templateId?: string;
  to: string;
  from: string;
  subject: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
  complainedAt?: string;
  unsubscribedAt?: string;
  errorMessage?: string;
  bounceReason?: string;
  bounceType?: 'permanent' | 'temporary';
  userAgent?: string;
  ipAddress?: string;
  linkClicked?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpSecure: boolean;
  defaultFromEmail: string;
  defaultFromName: string;
  replyToEmail?: string;
  trackOpens: boolean;
  trackClicks: boolean;
  autoGenerateTextVersion: boolean;
  bounceHandling: boolean;
  complaintHandling: boolean;
  unsubscribeHandling: boolean;
  domains: EmailDomain[];
  suppressionLists: SuppressionList[];
}

export interface EmailDomain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed';
  dkimStatus: 'pending' | 'verified' | 'failed';
  spfStatus: 'pending' | 'verified' | 'failed';
  dmarcStatus: 'pending' | 'verified' | 'failed';
  verificationToken?: string;
  dkimPublicKey?: string;
  spfRecord?: string;
  dmarcRecord?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface SuppressionList {
  id: string;
  name: string;
  type: 'bounce' | 'complaint' | 'unsubscribe' | 'manual';
  emails: string[];
  count: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecipientList {
  id: string;
  name: string;
  description?: string;
  totalRecipients: number;
  activeRecipients: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailRecipient {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  customFields: Record<string, unknown>;
  status: 'active' | 'unsubscribed' | 'bounced' | 'complained';
  tags: string[];
  subscriptionDate: string;
  lastEngagementDate?: string;
  totalOpens: number;
  totalClicks: number;
  listIds: string[];
}

// Email API service
export const emailApi = {
  // Basic email operations
  async sendEmail(data: SendEmailDto, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/send', data);
  },

  async sendTemplatedEmail(data: SendTemplatedEmailDto, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/send-templated', data);
  },

  async queueEmail(data: QueueEmailDto, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/queue', data);
  },

  async sendBulkEmail(data: BulkEmailDto, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/send-bulk', data);
  },

  async verifyEmail(data: VerifyEmailDto, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/verify', data);
  },

  // Template management
  async createTemplate(data: CreateEmailTemplateDto, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/template', data);
  },

  async getTemplates(projectId?: string, appId?: string): Promise<EmailTemplate[]> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: EmailTemplate[] }>('/email/templates');
    return response.data;
  },

  async getTemplate(id: string, projectId?: string, appId?: string): Promise<EmailTemplate> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: EmailTemplate }>(`/email/templates/${id}`);
    return response.data;
  },

  async updateTemplate(id: string, data: Partial<CreateEmailTemplateDto>, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.put(`/email/templates/${id}`, data);
  },

  async deleteTemplate(id: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.delete(`/email/templates/${id}`);
  },

  async duplicateTemplate(id: string, name: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post(`/email/templates/${id}/duplicate`, { name });
  },

  // Campaign management
  async getCampaigns(projectId?: string, appId?: string): Promise<EmailCampaign[]> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: EmailCampaign[] }>('/email/campaigns');
    return response.data;
  },

  async getCampaign(id: string, projectId?: string, appId?: string): Promise<EmailCampaign> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: EmailCampaign }>(`/email/campaigns/${id}`);
    return response.data;
  },

  async createCampaign(data: Partial<EmailCampaign>, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/campaigns', data);
  },

  async updateCampaign(id: string, data: Partial<EmailCampaign>, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.put(`/email/campaigns/${id}`, data);
  },

  async deleteCampaign(id: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.delete(`/email/campaigns/${id}`);
  },

  async scheduleCampaign(id: string, scheduledAt: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post(`/email/campaigns/${id}/schedule`, { scheduledAt });
  },

  async pauseCampaign(id: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post(`/email/campaigns/${id}/pause`, {});
  },

  async resumeCampaign(id: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post(`/email/campaigns/${id}/resume`, {});
  },

  async cancelCampaign(id: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post(`/email/campaigns/${id}/cancel`, {});
  },

  // Analytics and metrics
  async getMetrics(dateRange?: { from: string; to: string }, projectId?: string, appId?: string): Promise<EmailMetrics> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const queryString = dateRange ? `?from=${dateRange.from}&to=${dateRange.to}` : '';
    const response = await api.get<{ data: EmailMetrics }>(`/email/metrics${queryString}`);
    return response.data;
  },

  async getCampaignMetrics(campaignId: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: unknown }>(`/email/campaigns/${campaignId}/metrics`);
    return response.data;
  },

  async getTemplateMetrics(templateId: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: unknown }>(`/email/templates/${templateId}/metrics`);
    return response.data;
  },

  // Logs and tracking
  async getLogs(filters?: {
    campaignId?: string;
    templateId?: string;
    status?: string;
    dateRange?: { from: string; to: string };
    email?: string;
    limit?: number;
    offset?: number;
  }, projectId?: string, appId?: string): Promise<{ logs: EmailLog[]; total: number }> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    const params = new URLSearchParams();
    if (filters?.campaignId) params.append('campaignId', filters.campaignId);
    if (filters?.templateId) params.append('templateId', filters.templateId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.email) params.append('email', filters.email);
    if (filters?.dateRange?.from) params.append('from', filters.dateRange.from);
    if (filters?.dateRange?.to) params.append('to', filters.dateRange.to);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    const queryString = params.toString();
    const response = await api.get<{ data: { logs: EmailLog[]; total: number } }>(`/email/logs${queryString ? '?' + queryString : ''}`);
    return response.data;
  },

  async getLogDetails(logId: string, projectId?: string, appId?: string): Promise<EmailLog> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: EmailLog }>(`/email/logs/${logId}`);
    return response.data;
  },

  // Settings management
  async getSettings(projectId?: string, appId?: string): Promise<EmailSettings> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: EmailSettings }>('/email/settings');
    return response.data;
  },

  async updateSettings(data: Partial<EmailSettings>, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.put('/email/settings', data);
  },

  async testSmtpConnection(smtpConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
    secure: boolean;
  }, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/test-smtp', smtpConfig);
  },

  // Domain management
  async getDomains(projectId?: string, appId?: string): Promise<EmailDomain[]> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: EmailDomain[] }>('/email/domains');
    return response.data;
  },

  async addDomain(domain: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/domains', { domain });
  },

  async verifyDomain(domainId: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post(`/email/domains/${domainId}/verify`, {});
  },

  async deleteDomain(domainId: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.delete(`/email/domains/${domainId}`);
  },

  // Suppression list management
  async getSuppressionLists(projectId?: string, appId?: string): Promise<SuppressionList[]> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: SuppressionList[] }>('/email/suppression-lists');
    return response.data;
  },

  async createSuppressionList(data: { name: string; type: string; emails?: string[] }, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/suppression-lists', data);
  },

  async addToSuppressionList(listId: string, emails: string[], projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post(`/email/suppression-lists/${listId}/emails`, { emails });
  },

  async removeFromSuppressionList(listId: string, emails: string[], projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    // Delete with body needs special handling
    return api.request(`/email/suppression-lists/${listId}/emails`, { 
      method: 'DELETE',
      body: JSON.stringify({ emails })
    });
  },

  async deleteSuppressionList(listId: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.delete(`/email/suppression-lists/${listId}`);
  },

  // Recipient list management
  async getRecipientLists(projectId?: string, appId?: string): Promise<RecipientList[]> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: RecipientList[] }>('/email/recipient-lists');
    return response.data;
  },

  async createRecipientList(data: { name: string; description?: string }, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/recipient-lists', data);
  },

  async getRecipients(listId: string, filters?: {
    search?: string;
    status?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }, projectId?: string, appId?: string): Promise<{ recipients: EmailRecipient[]; total: number }> {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    const recipientParams = new URLSearchParams();
    if (filters?.search) recipientParams.append('search', filters.search);
    if (filters?.status) recipientParams.append('status', filters.status);
    if (filters?.tags?.length) recipientParams.append('tags', filters.tags.join(','));
    if (filters?.limit) recipientParams.append('limit', String(filters.limit));
    if (filters?.offset) recipientParams.append('offset', String(filters.offset));
    const queryString = recipientParams.toString();
    const response = await api.get<{ data: { recipients: EmailRecipient[]; total: number } }>(`/email/recipient-lists/${listId}/recipients${queryString ? '?' + queryString : ''}`);
    return response.data;
  },

  async addRecipients(listId: string, recipients: Partial<EmailRecipient>[], projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post(`/email/recipient-lists/${listId}/recipients`, { recipients });
  },

  async updateRecipient(listId: string, recipientId: string, data: Partial<EmailRecipient>, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.put(`/email/recipient-lists/${listId}/recipients/${recipientId}`, data);
  },

  async removeRecipient(listId: string, recipientId: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.delete(`/email/recipient-lists/${listId}/recipients/${recipientId}`);
  },

  // Email validation
  async validateEmails(emails: string[], projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/validate', { emails });
  },

  // Webhooks
  async getWebhooks(projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const response = await api.get<{ data: unknown }>('/email/webhooks');
    return response.data;
  },

  async createWebhook(data: {
    url: string;
    events: string[];
    isActive: boolean;
  }, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/email/webhooks', data);
  },

  async updateWebhook(webhookId: string, data: {
    url?: string;
    events?: string[];
    isActive?: boolean;
  }, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.put(`/email/webhooks/${webhookId}`, data);
  },

  async deleteWebhook(webhookId: string, projectId?: string, appId?: string) {
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.delete(`/email/webhooks/${webhookId}`);
  }
};