import { Request } from 'express';
import { ConnectorResponse, PaginatedRequest, BulkOperation, BulkOperationResult } from '../types';

// Common marketing interfaces and types
export interface MarketingContact {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  status?: 'subscribed' | 'unsubscribed' | 'pending' | 'cleaned';
  source?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarketingList {
  id?: string;
  name: string;
  description?: string;
  contactCount?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarketingSegment {
  id?: string;
  name: string;
  description?: string;
  criteria: Record<string, any>;
  contactCount?: number;
  listId?: string;
  isActive?: boolean;
  createdAt?: Date;
}

export interface EmailCampaign {
  id?: string;
  name: string;
  subject: string;
  content: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  listIds?: string[];
  segmentIds?: string[];
  templateId?: string;
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  scheduledAt?: Date;
  sentAt?: Date;
  settings?: {
    trackOpens?: boolean;
    trackClicks?: boolean;
    googleAnalytics?: string;
    authenticateDomain?: boolean;
    autoFooter?: boolean;
    inlineCss?: boolean;
    fbComments?: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmailTemplate {
  id?: string;
  name: string;
  subject?: string;
  content: string;
  description?: string;
  templateType?: 'email' | 'automation' | 'landing_page';
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarketingAutomation {
  id?: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AutomationTrigger {
  type: 'email_opened' | 'link_clicked' | 'form_submitted' | 'tag_added' | 'date_based' | 'api_trigger' | 'behavior';
  conditions: Record<string, any>;
}

export interface AutomationAction {
  type: 'send_email' | 'add_tag' | 'remove_tag' | 'move_to_list' | 'wait' | 'webhook';
  delay?: number; // in hours
  settings: Record<string, any>;
}

export interface CampaignStats {
  sent?: number;
  delivered?: number;
  opens?: number;
  uniqueOpens?: number;
  clicks?: number;
  uniqueClicks?: number;
  unsubscribes?: number;
  bounces?: number;
  complaints?: number;
  openRate?: number;
  clickRate?: number;
  unsubscribeRate?: number;
  bounceRate?: number;
  revenue?: number;
}

export interface AdCampaign {
  id?: string;
  name: string;
  objective?: string;
  status?: 'active' | 'paused' | 'deleted' | 'pending';
  budget?: {
    amount: number;
    type: 'daily' | 'lifetime';
    currency?: string;
  };
  targeting?: {
    audiences?: string[];
    locations?: string[];
    demographics?: Record<string, any>;
    interests?: string[];
    behaviors?: string[];
    customAudiences?: string[];
  };
  schedule?: {
    startDate?: Date;
    endDate?: Date;
    timezone?: string;
  };
  bidStrategy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AdSet {
  id?: string;
  campaignId: string;
  name: string;
  status?: 'active' | 'paused' | 'deleted';
  budget?: {
    amount: number;
    type: 'daily' | 'lifetime';
  };
  bidAmount?: number;
  targeting?: Record<string, any>;
  createdAt?: Date;
}

export interface Advertisement {
  id?: string;
  adSetId: string;
  name: string;
  status?: 'active' | 'paused' | 'deleted' | 'pending_review' | 'disapproved';
  creative: {
    title?: string;
    description?: string;
    imageUrl?: string;
    videoUrl?: string;
    callToAction?: string;
    destinationUrl?: string;
  };
  createdAt?: Date;
}

export interface Audience {
  id?: string;
  name: string;
  description?: string;
  type: 'saved' | 'custom' | 'lookalike';
  size?: number;
  criteria?: Record<string, any>;
  isReady?: boolean;
  createdAt?: Date;
}

export interface AdPerformance {
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: number;
  cpm?: number; // Cost per mille
  cpc?: number; // Cost per click
  cpa?: number; // Cost per acquisition
  ctr?: number; // Click-through rate
  conversionRate?: number;
  roas?: number; // Return on ad spend
  revenue?: number;
}

export interface BehaviorEvent {
  event: string;
  profile?: {
    email: string;
    firstName?: string;
    lastName?: string;
    [key: string]: any;
  };
  properties?: Record<string, any>;
  timestamp?: Date;
  value?: number;
}

export interface MarketingFlow {
  id?: string;
  name: string;
  status?: 'draft' | 'live' | 'paused' | 'stopped';
  trigger: {
    type: string;
    filters?: Record<string, any>;
  };
  actions: Array<{
    id: string;
    type: string;
    settings: Record<string, any>;
    delay?: number;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

// A/B Testing interfaces
export interface ABTest {
  id?: string;
  name: string;
  type: 'subject_line' | 'content' | 'send_time' | 'from_name';
  variants: Array<{
    id: string;
    name: string;
    content: any;
    percentage: number;
  }>;
  winnerCriteria: 'open_rate' | 'click_rate' | 'conversion_rate';
  testDuration?: number; // in hours
  status?: 'draft' | 'running' | 'completed' | 'cancelled';
  winner?: string; // variant id
  results?: Record<string, any>;
  createdAt?: Date;
}

// Main marketing connector interface
export interface IMarketingConnector {
  // Contact Management
  createContact(contact: Omit<MarketingContact, 'id'>): Promise<ConnectorResponse<MarketingContact>>;
  updateContact(contactId: string, updates: Partial<MarketingContact>): Promise<ConnectorResponse<MarketingContact>>;
  getContact(contactId: string): Promise<ConnectorResponse<MarketingContact>>;
  getContacts(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingContact[]>>;
  deleteContact(contactId: string): Promise<ConnectorResponse<void>>;
  bulkImportContacts(operation: BulkOperation<MarketingContact>): Promise<ConnectorResponse<BulkOperationResult<MarketingContact>>>;

  // List Management
  createList(list: Omit<MarketingList, 'id'>): Promise<ConnectorResponse<MarketingList>>;
  updateList(listId: string, updates: Partial<MarketingList>): Promise<ConnectorResponse<MarketingList>>;
  getList(listId: string): Promise<ConnectorResponse<MarketingList>>;
  getLists(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingList[]>>;
  deleteList(listId: string): Promise<ConnectorResponse<void>>;
  addContactToList(listId: string, contactId: string): Promise<ConnectorResponse<void>>;
  removeContactFromList(listId: string, contactId: string): Promise<ConnectorResponse<void>>;

  // Segmentation
  createSegment(segment: Omit<MarketingSegment, 'id'>): Promise<ConnectorResponse<MarketingSegment>>;
  updateSegment(segmentId: string, updates: Partial<MarketingSegment>): Promise<ConnectorResponse<MarketingSegment>>;
  getSegment(segmentId: string): Promise<ConnectorResponse<MarketingSegment>>;
  getSegments(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingSegment[]>>;
  deleteSegment(segmentId: string): Promise<ConnectorResponse<void>>;

  // Email Campaigns
  createCampaign(campaign: Omit<EmailCampaign, 'id'>): Promise<ConnectorResponse<EmailCampaign>>;
  updateCampaign(campaignId: string, updates: Partial<EmailCampaign>): Promise<ConnectorResponse<EmailCampaign>>;
  getCampaign(campaignId: string): Promise<ConnectorResponse<EmailCampaign>>;
  getCampaigns(params?: PaginatedRequest): Promise<ConnectorResponse<EmailCampaign[]>>;
  deleteCampaign(campaignId: string): Promise<ConnectorResponse<void>>;
  sendCampaign(campaignId: string, scheduledAt?: Date): Promise<ConnectorResponse<void>>;
  pauseCampaign(campaignId: string): Promise<ConnectorResponse<void>>;
  resumeCampaign(campaignId: string): Promise<ConnectorResponse<void>>;
  getCampaignStats(campaignId: string): Promise<ConnectorResponse<CampaignStats>>;

  // Email Templates
  createTemplate(template: Omit<EmailTemplate, 'id'>): Promise<ConnectorResponse<EmailTemplate>>;
  updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<ConnectorResponse<EmailTemplate>>;
  getTemplate(templateId: string): Promise<ConnectorResponse<EmailTemplate>>;
  getTemplates(params?: PaginatedRequest): Promise<ConnectorResponse<EmailTemplate[]>>;
  deleteTemplate(templateId: string): Promise<ConnectorResponse<void>>;

  // A/B Testing
  createABTest(test: Omit<ABTest, 'id'>): Promise<ConnectorResponse<ABTest>>;
  getABTest(testId: string): Promise<ConnectorResponse<ABTest>>;
  getABTestResults(testId: string): Promise<ConnectorResponse<Record<string, any>>>;

  // Automation/Flows (for platforms that support it)
  createAutomation?(automation: Omit<MarketingAutomation, 'id'>): Promise<ConnectorResponse<MarketingAutomation>>;
  updateAutomation?(automationId: string, updates: Partial<MarketingAutomation>): Promise<ConnectorResponse<MarketingAutomation>>;
  getAutomation?(automationId: string): Promise<ConnectorResponse<MarketingAutomation>>;
  getAutomations?(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingAutomation[]>>;
  deleteAutomation?(automationId: string): Promise<ConnectorResponse<void>>;

  // Behavioral Tracking (for platforms like Klaviyo)
  trackEvent?(event: BehaviorEvent): Promise<ConnectorResponse<void>>;
  getProfileEvents?(profileId: string, params?: PaginatedRequest): Promise<ConnectorResponse<BehaviorEvent[]>>;

  // Flow Management (Klaviyo-specific)
  createFlow?(flow: Omit<MarketingFlow, 'id'>): Promise<ConnectorResponse<MarketingFlow>>;
  updateFlow?(flowId: string, updates: Partial<MarketingFlow>): Promise<ConnectorResponse<MarketingFlow>>;
  getFlow?(flowId: string): Promise<ConnectorResponse<MarketingFlow>>;
  getFlows?(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingFlow[]>>;
  deleteFlow?(flowId: string): Promise<ConnectorResponse<void>>;

  // Analytics and Reporting
  getAccountStats?(): Promise<ConnectorResponse<Record<string, any>>>;
  getListGrowthStats?(listId: string, dateRange?: { startDate: Date; endDate: Date }): Promise<ConnectorResponse<Record<string, any>>>;
  getEngagementStats?(dateRange?: { startDate: Date; endDate: Date }): Promise<ConnectorResponse<Record<string, any>>>;
}

// Ad-specific interface for Google Ads and Facebook Ads
export interface IAdConnector {
  // Campaign Management
  createAdCampaign(campaign: Omit<AdCampaign, 'id'>): Promise<ConnectorResponse<AdCampaign>>;
  updateAdCampaign(campaignId: string, updates: Partial<AdCampaign>): Promise<ConnectorResponse<AdCampaign>>;
  getAdCampaign(campaignId: string): Promise<ConnectorResponse<AdCampaign>>;
  getAdCampaigns(params?: PaginatedRequest): Promise<ConnectorResponse<AdCampaign[]>>;
  deleteAdCampaign(campaignId: string): Promise<ConnectorResponse<void>>;
  pauseAdCampaign(campaignId: string): Promise<ConnectorResponse<void>>;
  resumeAdCampaign(campaignId: string): Promise<ConnectorResponse<void>>;

  // Ad Set Management
  createAdSet(adSet: Omit<AdSet, 'id'>): Promise<ConnectorResponse<AdSet>>;
  updateAdSet(adSetId: string, updates: Partial<AdSet>): Promise<ConnectorResponse<AdSet>>;
  getAdSet(adSetId: string): Promise<ConnectorResponse<AdSet>>;
  getAdSets(campaignId?: string, params?: PaginatedRequest): Promise<ConnectorResponse<AdSet[]>>;
  deleteAdSet(adSetId: string): Promise<ConnectorResponse<void>>;

  // Ad Management
  createAd(ad: Omit<Advertisement, 'id'>): Promise<ConnectorResponse<Advertisement>>;
  updateAd(adId: string, updates: Partial<Advertisement>): Promise<ConnectorResponse<Advertisement>>;
  getAd(adId: string): Promise<ConnectorResponse<Advertisement>>;
  getAds(adSetId?: string, params?: PaginatedRequest): Promise<ConnectorResponse<Advertisement[]>>;
  deleteAd(adId: string): Promise<ConnectorResponse<void>>;
  pauseAd(adId: string): Promise<ConnectorResponse<void>>;
  resumeAd(adId: string): Promise<ConnectorResponse<void>>;

  // Audience Management
  createAudience(audience: Omit<Audience, 'id'>): Promise<ConnectorResponse<Audience>>;
  updateAudience(audienceId: string, updates: Partial<Audience>): Promise<ConnectorResponse<Audience>>;
  getAudience(audienceId: string): Promise<ConnectorResponse<Audience>>;
  getAudiences(params?: PaginatedRequest): Promise<ConnectorResponse<Audience[]>>;
  deleteAudience(audienceId: string): Promise<ConnectorResponse<void>>;

  // Performance and Analytics
  getCampaignPerformance(campaignId: string, dateRange?: { startDate: Date; endDate: Date }): Promise<ConnectorResponse<AdPerformance>>;
  getAdSetPerformance(adSetId: string, dateRange?: { startDate: Date; endDate: Date }): Promise<ConnectorResponse<AdPerformance>>;
  getAdPerformance(adId: string, dateRange?: { startDate: Date; endDate: Date }): Promise<ConnectorResponse<AdPerformance>>;
  getAccountPerformance(dateRange?: { startDate: Date; endDate: Date }): Promise<ConnectorResponse<AdPerformance>>;

  // Budget Management
  updateCampaignBudget(campaignId: string, budget: { amount: number; type: 'daily' | 'lifetime' }): Promise<ConnectorResponse<void>>;
  getAccountBudget?(): Promise<ConnectorResponse<{ balance: number; currency: string }>>;

  // Keyword Management (Google Ads specific)
  addKeywords?(adGroupId: string, keywords: string[]): Promise<ConnectorResponse<void>>;
  removeKeywords?(adGroupId: string, keywords: string[]): Promise<ConnectorResponse<void>>;
  getKeywords?(adGroupId: string, params?: PaginatedRequest): Promise<ConnectorResponse<string[]>>;
  getKeywordPerformance?(adGroupId: string, dateRange?: { startDate: Date; endDate: Date }): Promise<ConnectorResponse<Record<string, any>>>;
}