import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { FacebookAdsApi, Campaign, AdSet, Ad, CustomAudience, AdAccount } from 'facebook-nodejs-business-sdk';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorMetadata,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  PaginatedRequest
} from '../../types';
import {
  IAdConnector,
  AdCampaign,
  AdSet as IAdSet,
  Advertisement,
  Audience,
  AdPerformance
} from '../marketing.interface';

interface FacebookAdsConfig {
  accessToken: string;
  appId: string;
  appSecret: string;
  adAccountId: string;
}

interface FacebookCampaign {
  id?: string;
  name: string;
  objective?: 'REACH' | 'BRAND_AWARENESS' | 'LINK_CLICKS' | 'POST_ENGAGEMENT' | 'PAGE_LIKES' | 'EVENT_RESPONSES' | 'MESSAGES' | 'CONVERSIONS' | 'CATALOG_SALES' | 'STORE_VISITS' | 'VIDEO_VIEWS' | 'LEAD_GENERATION' | 'APP_INSTALLS';
  status?: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  special_ad_categories?: string[];
  buying_type?: 'AUCTION' | 'RESERVED';
  budget_rebalance_flag?: boolean;
  daily_budget?: number;
  lifetime_budget?: number;
  bid_strategy?: 'LOWEST_COST_WITHOUT_CAP' | 'LOWEST_COST_WITH_BID_CAP' | 'TARGET_COST';
  created_time?: string;
  updated_time?: string;
  start_time?: string;
  stop_time?: string;
}

interface FacebookAdSet {
  id?: string;
  campaign_id: string;
  name: string;
  status?: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  billing_event?: 'IMPRESSIONS' | 'CLICKS' | 'ACTIONS' | 'THRUPLAY';
  optimization_goal?: 'REACH' | 'IMPRESSIONS' | 'CLICKS' | 'ACTIONS' | 'UNIQUE_CLICKS' | 'COST_PER_RESULT' | 'REVENUE' | 'RETURN_ON_AD_SPEND';
  bid_amount?: number;
  daily_budget?: number;
  lifetime_budget?: number;
  targeting?: {
    geo_locations?: {
      countries?: string[];
      regions?: Array<{ key: string }>;
      cities?: Array<{ key: string; radius: number; distance_unit: 'mile' | 'kilometer' }>;
    };
    age_min?: number;
    age_max?: number;
    genders?: number[];
    interests?: Array<{ id: string; name: string }>;
    behaviors?: Array<{ id: string; name: string }>;
    custom_audiences?: Array<{ id: string; name: string }>;
    lookalike_audiences?: Array<{ id: string; name: string }>;
    excluded_custom_audiences?: Array<{ id: string; name: string }>;
  };
  created_time?: string;
  updated_time?: string;
  start_time?: string;
  end_time?: string;
}

interface FacebookAd {
  id?: string;
  adset_id: string;
  name: string;
  status?: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'PENDING_REVIEW' | 'DISAPPROVED' | 'PREAPPROVED' | 'PENDING_BILLING_INFO' | 'CAMPAIGN_PAUSED' | 'ADSET_PAUSED';
  creative?: {
    title?: string;
    body?: string;
    image_url?: string;
    video_id?: string;
    call_to_action_type?: 'LEARN_MORE' | 'SHOP_NOW' | 'BOOK_TRAVEL' | 'DOWNLOAD' | 'SIGN_UP' | 'CONTACT_US' | 'DONATE' | 'APPLY_NOW' | 'SEE_MENU' | 'CALL_NOW';
    object_story_spec?: {
      page_id: string;
      link_data?: {
        link?: string;
        message?: string;
        name?: string;
        description?: string;
        image_hash?: string;
        call_to_action?: {
          type: string;
          value?: {
            link?: string;
          };
        };
      };
      video_data?: {
        video_id?: string;
        image_url?: string;
        title?: string;
        message?: string;
        call_to_action?: {
          type: string;
          value?: {
            link?: string;
          };
        };
      };
    };
  };
  created_time?: string;
  updated_time?: string;
}

interface FacebookCustomAudience {
  id?: string;
  name: string;
  description?: string;
  subtype?: 'CUSTOM' | 'WEBSITE' | 'APP' | 'OFFLINE_CONVERSION' | 'CLAIM' | 'PARTNER' | 'MANAGED' | 'VIDEO' | 'LOOKALIKE' | 'ENGAGEMENT' | 'DATA_SET' | 'BAG_OF_ACCOUNTS' | 'STUDY_RULE_AUDIENCE' | 'FOX';
  customer_file_source?: 'USER_PROVIDED_ONLY' | 'PARTNER_PROVIDED_ONLY' | 'BOTH_USER_AND_PARTNER_PROVIDED';
  is_value_based?: boolean;
  lookalike_spec?: {
    ratio: number;
    country: string;
    conversion_type?: string;
  };
  retention_days?: number;
  rule?: string;
  approximate_count?: number;
  data_source?: {
    sub_type: string;
  };
  delivery_status?: {
    code: number;
    description: string;
  };
  operation_status?: {
    code: number;
    description: string;
  };
  time_created?: number;
  time_updated?: number;
}

@Injectable()
export class FacebookAdsConnector extends BaseConnector implements IAdConnector {
  private api: typeof FacebookAdsApi;
  private adAccount: AdAccount;
  private adAccountId: string;

  constructor() {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Facebook Ads',
      description: 'Facebook advertising platform for social media advertising',
      version: '1.0.0',
      category: ConnectorCategory.MARKETING,
      type: ConnectorType.FACEBOOK_ADS,
      logoUrl: 'https://www.facebook.com/images/fb_icon_325x325.png',
      documentationUrl: 'https://developers.facebook.com/docs/marketing-api/',
      authType: AuthType.BEARER_TOKEN,
      requiredScopes: ['ads_management', 'ads_read', 'business_management'],
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 200,
        requestsPerHour: 4800
      },
      actions: [
        // HTTP Request Action
        {
          id: 'http_request',
          name: 'HTTP Request',
          description: 'Make any custom HTTP request to Facebook Graph API',
          inputSchema: {
            method: { type: 'string', required: true, enum: ['GET', 'POST', 'DELETE'] },
            node: { type: 'string', required: true },
            edge: { type: 'string' },
            version: { type: 'string' },
            queryParameters: { type: 'object' },
            body: { type: 'object' }
          },
          outputSchema: {
            result: { type: 'object' }
          }
        },
        // Campaign Actions
        {
          id: 'get_campaigns',
          name: 'Get Campaigns',
          description: 'Retrieve all ad campaigns from an ad account',
          inputSchema: {
            fields: { type: 'array' },
            limit: { type: 'number' }
          },
          outputSchema: {
            campaigns: { type: 'array' }
          }
        },
        {
          id: 'get_campaign',
          name: 'Get Campaign',
          description: 'Retrieve details of a specific campaign',
          inputSchema: {
            campaignId: { type: 'string', required: true },
            fields: { type: 'array' }
          },
          outputSchema: {
            campaign: { type: 'object' }
          }
        },
        {
          id: 'create_campaign',
          name: 'Create Campaign',
          description: 'Create a new Facebook Ads campaign',
          inputSchema: {
            name: { type: 'string', required: true },
            objective: { type: 'string', required: true },
            budget: { type: 'number', required: true },
            budgetType: { type: 'string', enum: ['daily', 'lifetime'] },
            status: { type: 'string', enum: ['ACTIVE', 'PAUSED'] },
            specialAdCategories: { type: 'array' }
          },
          outputSchema: {
            id: { type: 'string' },
            name: { type: 'string' },
            objective: { type: 'string' }
          }
        },
        {
          id: 'update_campaign',
          name: 'Update Campaign',
          description: 'Update an existing campaign',
          inputSchema: {
            campaignId: { type: 'string', required: true },
            name: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'PAUSED'] },
            budget: { type: 'number' },
            budgetType: { type: 'string', enum: ['daily', 'lifetime'] }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        {
          id: 'delete_campaign',
          name: 'Delete Campaign',
          description: 'Delete a campaign',
          inputSchema: {
            campaignId: { type: 'string', required: true }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        // Ad Set Actions
        {
          id: 'get_adsets',
          name: 'Get Ad Sets',
          description: 'Retrieve all ad sets from an ad account or campaign',
          inputSchema: {
            campaignId: { type: 'string' },
            fields: { type: 'array' },
            limit: { type: 'number' }
          },
          outputSchema: {
            adsets: { type: 'array' }
          }
        },
        {
          id: 'get_adset',
          name: 'Get Ad Set',
          description: 'Retrieve details of a specific ad set',
          inputSchema: {
            adsetId: { type: 'string', required: true },
            fields: { type: 'array' }
          },
          outputSchema: {
            adset: { type: 'object' }
          }
        },
        {
          id: 'create_adset',
          name: 'Create Ad Set',
          description: 'Create a new ad set within a campaign',
          inputSchema: {
            campaignId: { type: 'string', required: true },
            name: { type: 'string', required: true },
            budget: { type: 'number', required: true },
            budgetType: { type: 'string', enum: ['daily', 'lifetime'] },
            targeting: { type: 'object', required: true },
            billingEvent: { type: 'string' },
            optimizationGoal: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'PAUSED'] }
          },
          outputSchema: {
            id: { type: 'string' },
            name: { type: 'string' },
            campaignId: { type: 'string' }
          }
        },
        {
          id: 'update_adset',
          name: 'Update Ad Set',
          description: 'Update an existing ad set',
          inputSchema: {
            adsetId: { type: 'string', required: true },
            name: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'PAUSED'] },
            budget: { type: 'number' },
            budgetType: { type: 'string', enum: ['daily', 'lifetime'] }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        {
          id: 'delete_adset',
          name: 'Delete Ad Set',
          description: 'Delete an ad set',
          inputSchema: {
            adsetId: { type: 'string', required: true }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        // Ad Actions
        {
          id: 'get_ads',
          name: 'Get Ads',
          description: 'Retrieve all ads from an ad account, campaign, or ad set',
          inputSchema: {
            adsetId: { type: 'string' },
            fields: { type: 'array' },
            limit: { type: 'number' }
          },
          outputSchema: {
            ads: { type: 'array' }
          }
        },
        {
          id: 'get_ad',
          name: 'Get Ad',
          description: 'Retrieve details of a specific ad',
          inputSchema: {
            adId: { type: 'string', required: true },
            fields: { type: 'array' }
          },
          outputSchema: {
            ad: { type: 'object' }
          }
        },
        {
          id: 'update_ad',
          name: 'Update Ad',
          description: 'Update an existing ad',
          inputSchema: {
            adId: { type: 'string', required: true },
            name: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'PAUSED'] }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        {
          id: 'delete_ad',
          name: 'Delete Ad',
          description: 'Delete an ad',
          inputSchema: {
            adId: { type: 'string', required: true }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        // Lead Actions
        {
          id: 'get_lead',
          name: 'Get Lead',
          description: 'Retrieve details of a specific lead',
          inputSchema: {
            leadgenId: { type: 'string', required: true },
            fields: { type: 'array' }
          },
          outputSchema: {
            lead: { type: 'object' }
          }
        },
        {
          id: 'get_leadgen_forms',
          name: 'Get Lead Forms',
          description: 'Retrieve all lead generation forms from a Facebook page',
          inputSchema: {
            pageId: { type: 'string', required: true },
            fields: { type: 'array' },
            limit: { type: 'number' }
          },
          outputSchema: {
            forms: { type: 'array' }
          }
        },
        {
          id: 'get_form_leads',
          name: 'Get Form Leads',
          description: 'Retrieve all leads from a specific lead generation form',
          inputSchema: {
            formId: { type: 'string', required: true },
            fields: { type: 'array' },
            limit: { type: 'number' }
          },
          outputSchema: {
            leads: { type: 'array' }
          }
        },
        // Insights Action
        {
          id: 'get_insights',
          name: 'Get Insights',
          description: 'Retrieve performance insights for campaigns, ad sets, or ads',
          inputSchema: {
            objectType: { type: 'string', required: true, enum: ['campaign', 'adset', 'ad', 'account'] },
            objectId: { type: 'string', required: true },
            fields: { type: 'array' },
            datePreset: { type: 'string' },
            since: { type: 'string' },
            until: { type: 'string' },
            breakdowns: { type: 'array' }
          },
          outputSchema: {
            insights: { type: 'array' }
          }
        },
        // Audience Actions
        {
          id: 'get_custom_audiences',
          name: 'Get Custom Audiences',
          description: 'Retrieve all custom audiences from an ad account',
          inputSchema: {
            fields: { type: 'array' },
            limit: { type: 'number' }
          },
          outputSchema: {
            audiences: { type: 'array' }
          }
        },
        {
          id: 'create_custom_audience',
          name: 'Create Custom Audience',
          description: 'Create a new custom audience',
          inputSchema: {
            name: { type: 'string', required: true },
            description: { type: 'string' },
            subtype: { type: 'string', enum: ['CUSTOM', 'WEBSITE', 'APP', 'OFFLINE_CONVERSION', 'LOOKALIKE'] }
          },
          outputSchema: {
            id: { type: 'string' },
            name: { type: 'string' },
            success: { type: 'boolean' }
          }
        }
      ],
      triggers: [
        {
          id: 'new_lead',
          name: 'New Lead',
          description: 'Triggers when a new lead is submitted through a Facebook Lead Ad form',
          eventType: 'leadgen',
          outputSchema: {
            id: { type: 'string' },
            data: { type: 'object' },
            form: { type: 'object' },
            ad: { type: 'object' },
            adset: { type: 'object' },
            page: { type: 'object' },
            created_time: { type: 'string' }
          },
          webhookRequired: true
        },
        {
          id: 'campaign_delivery_issue',
          name: 'Campaign Delivery Issue',
          description: 'Triggered when a campaign has delivery issues',
          eventType: 'campaign.delivery_issue',
          outputSchema: {
            campaignId: { type: 'string' },
            issue: { type: 'string' },
            timestamp: { type: 'string' }
          },
          webhookRequired: true
        },
        {
          id: 'budget_spent',
          name: 'Budget Spent',
          description: 'Triggered when campaign budget is fully spent',
          eventType: 'budget.spent',
          outputSchema: {
            campaignId: { type: 'string' },
            budgetAmount: { type: 'number' },
            timestamp: { type: 'string' }
          },
          webhookRequired: true
        },
        {
          id: 'ad_disapproved',
          name: 'Ad Disapproved',
          description: 'Triggered when an ad is disapproved',
          eventType: 'ad.disapproved',
          outputSchema: {
            adId: { type: 'string' },
            reason: { type: 'string' },
            timestamp: { type: 'string' }
          },
          webhookRequired: true
        }
      ],
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    const config = this.config.credentials as FacebookAdsConfig;
    
    if (!config.accessToken || !config.appId || !config.appSecret || !config.adAccountId) {
      throw new Error('Facebook Ads requires accessToken, appId, appSecret, and adAccountId');
    }

    this.adAccountId = config.adAccountId;

    this.api = FacebookAdsApi.init(config.accessToken);
    this.api.setDebug(false);

    this.adAccount = new AdAccount(`act_${config.adAccountId}`);

    this.logger.log('Facebook Ads client initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const account = await this.adAccount.read(['id', 'name', 'account_status']);
      return account && account.id === `act_${this.adAccountId}`;
    } catch (error) {
      throw new Error(`Facebook Ads connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      const account = await this.adAccount.read(['id', 'name', 'account_status']);
      
      if (!account || account.account_status !== 1) {
        throw new Error('Facebook Ads account is not active');
      }
    } catch (error) {
      throw new Error(`Facebook Ads health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: any): Promise<any> {
    // This method handles generic API requests if needed
    throw new Error('Generic requests not implemented for Facebook Ads connector');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // HTTP Request
      case 'http_request':
        return this.executeHttpRequest(input);

      // Campaign Actions
      case 'get_campaigns':
        return this.getAdCampaigns({ pageSize: input.limit });
      case 'get_campaign':
        return this.getAdCampaign(input.campaignId);
      case 'create_campaign':
        return this.createAdCampaign({
          name: input.name,
          objective: input.objective,
          budget: {
            amount: input.budget,
            type: input.budgetType || 'daily'
          },
          status: input.status === 'ACTIVE' ? 'active' : 'paused'
        });
      case 'update_campaign':
        return this.updateAdCampaign(input.campaignId, {
          name: input.name,
          status: input.status === 'ACTIVE' ? 'active' : 'paused',
          budget: input.budget ? { amount: input.budget, type: input.budgetType || 'daily' } : undefined
        });
      case 'delete_campaign':
        return this.deleteAdCampaign(input.campaignId);

      // Ad Set Actions
      case 'get_adsets':
        return this.getAdSets(input.campaignId, { pageSize: input.limit });
      case 'get_adset':
        return this.getAdSet(input.adsetId);
      case 'create_adset':
        return this.createAdSet({
          campaignId: input.campaignId,
          name: input.name,
          budget: {
            amount: input.budget,
            type: input.budgetType || 'daily'
          },
          targeting: input.targeting,
          status: input.status === 'ACTIVE' ? 'active' : 'paused'
        });
      case 'update_adset':
        return this.updateAdSet(input.adsetId, {
          name: input.name,
          status: input.status === 'ACTIVE' ? 'active' : 'paused',
          budget: input.budget ? { amount: input.budget, type: input.budgetType || 'daily' } : undefined
        });
      case 'delete_adset':
        return this.deleteAdSet(input.adsetId);

      // Ad Actions
      case 'get_ads':
        return this.getAds(input.adsetId, { pageSize: input.limit });
      case 'get_ad':
        return this.getAd(input.adId);
      case 'update_ad':
        return this.updateAd(input.adId, {
          name: input.name,
          status: input.status === 'ACTIVE' ? 'active' : 'paused'
        });
      case 'delete_ad':
        return this.deleteAd(input.adId);

      // Lead Actions
      case 'get_lead':
        return this.getLead(input.leadgenId, input.fields);
      case 'get_leadgen_forms':
        return this.getLeadgenForms(input.pageId, input.fields, input.limit);
      case 'get_form_leads':
        return this.getFormLeads(input.formId, input.fields, input.limit);

      // Insights Action
      case 'get_insights':
        return this.getInsights(input);

      // Audience Actions
      case 'get_custom_audiences':
        return this.getAudiences({ pageSize: input.limit });
      case 'create_custom_audience':
        return this.createAudience({
          name: input.name,
          description: input.description,
          type: (input.subtype || 'CUSTOM').toLowerCase() as 'saved' | 'custom' | 'lookalike'
        });

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  // HTTP Request implementation
  private async executeHttpRequest(input: any): Promise<ConnectorResponse> {
    try {
      const config = this.config.credentials as FacebookAdsConfig;
      const version = input.version || 'v23.0';
      const baseUrl = input.hostUrl === 'graph-video.facebook.com'
        ? 'https://graph-video.facebook.com'
        : 'https://graph.facebook.com';

      let url = `${baseUrl}/${version}/${input.node}`;
      if (input.edge) {
        url += `/${input.edge}`;
      }

      const response = await this.performRequest({
        method: input.method,
        endpoint: url,
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: input.body,
        params: input.queryParameters
      });

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error as any, 'HTTP request failed');
    }
  }

  // Lead Actions
  private async getLead(leadgenId: string, fields?: string[]): Promise<ConnectorResponse> {
    try {
      const config = this.config.credentials as FacebookAdsConfig;
      const defaultFields = fields || ['id', 'field_data', 'created_time', 'ad_id', 'ad_name', 'adset_id', 'adset_name', 'form_id'];

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `https://graph.facebook.com/v23.0/${leadgenId}`,
        headers: { 'Authorization': `Bearer ${config.accessToken}` },
        params: { fields: defaultFields.join(',') }
      });

      return { success: true, data: response };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get lead');
    }
  }

  private async getLeadgenForms(pageId: string, fields?: string[], limit?: number): Promise<ConnectorResponse> {
    try {
      const config = this.config.credentials as FacebookAdsConfig;
      const defaultFields = fields || ['id', 'name', 'status', 'locale', 'questions'];

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `https://graph.facebook.com/v23.0/${pageId}/leadgen_forms`,
        headers: { 'Authorization': `Bearer ${config.accessToken}` },
        params: {
          fields: defaultFields.join(','),
          limit: limit || 25
        }
      });

      return { success: true, data: { forms: response.data || response } };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get lead forms');
    }
  }

  private async getFormLeads(formId: string, fields?: string[], limit?: number): Promise<ConnectorResponse> {
    try {
      const config = this.config.credentials as FacebookAdsConfig;
      const defaultFields = fields || ['id', 'field_data', 'created_time', 'ad_id', 'ad_name'];

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `https://graph.facebook.com/v23.0/${formId}/leads`,
        headers: { 'Authorization': `Bearer ${config.accessToken}` },
        params: {
          fields: defaultFields.join(','),
          limit: limit || 25
        }
      });

      return { success: true, data: { leads: response.data || response } };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get form leads');
    }
  }

  // Insights Action
  private async getInsights(input: any): Promise<ConnectorResponse> {
    try {
      const config = this.config.credentials as FacebookAdsConfig;
      const defaultFields = input.fields || ['impressions', 'clicks', 'spend', 'cpm', 'cpc', 'ctr', 'reach'];

      let objectId = input.objectId;
      if (input.objectType === 'account' && !objectId.startsWith('act_')) {
        objectId = `act_${objectId}`;
      }

      const params: any = {
        fields: defaultFields.join(',')
      };

      if (input.datePreset && input.datePreset !== 'custom') {
        params.date_preset = input.datePreset;
      } else if (input.since && input.until) {
        params.time_range = JSON.stringify({ since: input.since, until: input.until });
      }

      if (input.breakdowns && input.breakdowns.length > 0) {
        params.breakdowns = input.breakdowns.join(',');
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `https://graph.facebook.com/v23.0/${objectId}/insights`,
        headers: { 'Authorization': `Bearer ${config.accessToken}` },
        params
      });

      return { success: true, data: { insights: response.data || response } };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get insights');
    }
  }

  protected async cleanup(): Promise<void> {
    this.api = null;
    this.adAccount = null;
  }

  // IAdConnector implementation

  async createAdCampaign(campaign: Omit<AdCampaign, 'id'>): Promise<ConnectorResponse<AdCampaign>> {
    try {
      const campaignData: Partial<FacebookCampaign> = {
        name: campaign.name,
        objective: this.mapObjectiveToFacebook(campaign.objective) as any,
        status: campaign.status === 'active' ? 'ACTIVE' : 'PAUSED',
        special_ad_categories: [],
        buying_type: 'AUCTION'
      };

      if (campaign.budget?.type === 'daily') {
        campaignData.daily_budget = Math.round(campaign.budget.amount * 100); // Facebook expects cents
      } else if (campaign.budget?.type === 'lifetime') {
        campaignData.lifetime_budget = Math.round(campaign.budget.amount * 100);
      }

      if (campaign.schedule?.startDate) {
        campaignData.start_time = campaign.schedule.startDate.toISOString();
      }
      if (campaign.schedule?.endDate) {
        campaignData.stop_time = campaign.schedule.endDate.toISOString();
      }

      const fbCampaign = await this.adAccount.createCampaign([], campaignData);

      const transformedCampaign: AdCampaign = {
        id: fbCampaign.id,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        budget: campaign.budget,
        targeting: campaign.targeting,
        schedule: campaign.schedule,
        createdAt: new Date()
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create ad campaign');
    }
  }

  async updateAdCampaign(campaignId: string, updates: Partial<AdCampaign>): Promise<ConnectorResponse<AdCampaign>> {
    try {
      const campaign = new Campaign(campaignId);
      const updateData: any = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.status) updateData.status = updates.status === 'active' ? 'ACTIVE' : 'PAUSED';
      
      if (updates.budget) {
        if (updates.budget.type === 'daily') {
          updateData.daily_budget = Math.round(updates.budget.amount * 100);
          updateData.lifetime_budget = null;
        } else {
          updateData.lifetime_budget = Math.round(updates.budget.amount * 100);
          updateData.daily_budget = null;
        }
      }

      if (updates.schedule?.startDate) {
        updateData.start_time = updates.schedule.startDate.toISOString();
      }
      if (updates.schedule?.endDate) {
        updateData.stop_time = updates.schedule.endDate.toISOString();
      }

      await campaign.update([], updateData);

      const transformedCampaign: AdCampaign = {
        id: campaignId,
        name: updates.name || '',
        status: updates.status,
        budget: updates.budget,
        updatedAt: new Date()
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update ad campaign');
    }
  }

  async getAdCampaign(campaignId: string): Promise<ConnectorResponse<AdCampaign>> {
    try {
      const campaign = new Campaign(campaignId);
      const result = await campaign.read([
        'id', 'name', 'objective', 'status', 'daily_budget', 'lifetime_budget',
        'start_time', 'stop_time', 'created_time', 'updated_time'
      ]);

      const transformedCampaign: AdCampaign = {
        id: result.id,
        name: result.name,
        objective: this.mapObjectiveFromFacebook(result.objective),
        status: result.status === 'ACTIVE' ? 'active' : 'paused',
        budget: {
          amount: result.daily_budget ? result.daily_budget / 100 : result.lifetime_budget / 100,
          type: result.daily_budget ? 'daily' : 'lifetime'
        },
        schedule: {
          startDate: result.start_time ? new Date(result.start_time) : undefined,
          endDate: result.stop_time ? new Date(result.stop_time) : undefined
        },
        createdAt: result.created_time ? new Date(result.created_time) : undefined
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get ad campaign');
    }
  }

  async getAdCampaigns(params?: PaginatedRequest): Promise<ConnectorResponse<AdCampaign[]>> {
    try {
      const requestParams: any = {
        limit: params?.pageSize || 50
      };

      if (params?.page && params.page > 1) {
        requestParams.after = `page_${params.page}`;
      }

      const campaigns = await this.adAccount.getCampaigns([
        'id', 'name', 'objective', 'status', 'daily_budget', 'lifetime_budget',
        'start_time', 'stop_time', 'created_time', 'updated_time'
      ], requestParams);

      const transformedCampaigns: AdCampaign[] = campaigns.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        objective: this.mapObjectiveFromFacebook(campaign.objective),
        status: campaign.status === 'ACTIVE' ? 'active' : 'paused',
        budget: {
          amount: campaign.daily_budget ? campaign.daily_budget / 100 : campaign.lifetime_budget / 100,
          type: campaign.daily_budget ? 'daily' : 'lifetime'
        },
        schedule: {
          startDate: campaign.start_time ? new Date(campaign.start_time) : undefined,
          endDate: campaign.stop_time ? new Date(campaign.stop_time) : undefined
        },
        createdAt: campaign.created_time ? new Date(campaign.created_time) : undefined
      }));

      return { 
        success: true, 
        data: transformedCampaigns,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: transformedCampaigns.length === (params?.pageSize || 50)
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get ad campaigns');
    }
  }

  async deleteAdCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      const campaign = new Campaign(campaignId);
      await campaign.update([], { status: 'DELETED' });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete ad campaign');
    }
  }

  async pauseAdCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.updateAdCampaign(campaignId, { status: 'paused' });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to pause ad campaign');
    }
  }

  async resumeAdCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.updateAdCampaign(campaignId, { status: 'active' });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to resume ad campaign');
    }
  }

  async createAdSet(adSet: Omit<IAdSet, 'id'>): Promise<ConnectorResponse<IAdSet>> {
    try {
      const adSetData: Partial<FacebookAdSet> = {
        campaign_id: adSet.campaignId,
        name: adSet.name,
        status: adSet.status === 'active' ? 'ACTIVE' : 'PAUSED',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH'
      };

      if (adSet.budget?.type === 'daily') {
        adSetData.daily_budget = Math.round(adSet.budget.amount * 100);
      } else {
        adSetData.lifetime_budget = Math.round((adSet.budget?.amount || 0) * 100);
      }

      if (adSet.bidAmount) {
        adSetData.bid_amount = Math.round(adSet.bidAmount * 100);
      }

      if (adSet.targeting) {
        adSetData.targeting = this.convertTargeting(adSet.targeting);
      }

      const fbAdSet = await this.adAccount.createAdSet([], adSetData);

      const transformedAdSet: IAdSet = {
        id: fbAdSet.id,
        campaignId: adSet.campaignId,
        name: adSet.name,
        status: adSet.status,
        budget: adSet.budget,
        bidAmount: adSet.bidAmount,
        targeting: adSet.targeting,
        createdAt: new Date()
      };

      return { success: true, data: transformedAdSet };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create ad set');
    }
  }

  async updateAdSet(adSetId: string, updates: Partial<IAdSet>): Promise<ConnectorResponse<IAdSet>> {
    try {
      const adSet = new AdSet(adSetId);
      const updateData: any = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.status) updateData.status = updates.status === 'active' ? 'ACTIVE' : 'PAUSED';
      
      if (updates.budget) {
        if (updates.budget.type === 'daily') {
          updateData.daily_budget = Math.round(updates.budget.amount * 100);
          updateData.lifetime_budget = null;
        } else {
          updateData.lifetime_budget = Math.round(updates.budget.amount * 100);
          updateData.daily_budget = null;
        }
      }

      if (updates.bidAmount) {
        updateData.bid_amount = Math.round(updates.bidAmount * 100);
      }

      if (updates.targeting) {
        updateData.targeting = this.convertTargeting(updates.targeting);
      }

      await adSet.update([], updateData);

      const transformedAdSet: IAdSet = {
        id: adSetId,
        campaignId: updates.campaignId || '',
        name: updates.name || '',
        status: updates.status,
        budget: updates.budget,
        bidAmount: updates.bidAmount
      };

      return { success: true, data: transformedAdSet };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update ad set');
    }
  }

  async getAdSet(adSetId: string): Promise<ConnectorResponse<IAdSet>> {
    try {
      const adSet = new AdSet(adSetId);
      const result = await adSet.read([
        'id', 'campaign_id', 'name', 'status', 'daily_budget', 'lifetime_budget',
        'bid_amount', 'targeting', 'created_time', 'updated_time'
      ]);

      const transformedAdSet: IAdSet = {
        id: result.id,
        campaignId: result.campaign_id,
        name: result.name,
        status: result.status === 'ACTIVE' ? 'active' : 'paused',
        budget: {
          amount: result.daily_budget ? result.daily_budget / 100 : result.lifetime_budget / 100,
          type: result.daily_budget ? 'daily' : 'lifetime'
        },
        bidAmount: result.bid_amount ? result.bid_amount / 100 : undefined,
        targeting: this.convertTargetingFromFacebook(result.targeting),
        createdAt: result.created_time ? new Date(result.created_time) : undefined
      };

      return { success: true, data: transformedAdSet };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get ad set');
    }
  }

  async getAdSets(campaignId?: string, params?: PaginatedRequest): Promise<ConnectorResponse<IAdSet[]>> {
    try {
      const requestParams: any = {
        limit: params?.pageSize || 50
      };

      if (params?.page && params.page > 1) {
        requestParams.after = `page_${params.page}`;
      }

      let adSets: any[];
      
      if (campaignId) {
        const campaign = new Campaign(campaignId);
        adSets = await campaign.getAdSets([
          'id', 'campaign_id', 'name', 'status', 'daily_budget', 'lifetime_budget',
          'bid_amount', 'targeting', 'created_time', 'updated_time'
        ], requestParams);
      } else {
        adSets = await this.adAccount.getAdSets([
          'id', 'campaign_id', 'name', 'status', 'daily_budget', 'lifetime_budget',
          'bid_amount', 'targeting', 'created_time', 'updated_time'
        ], requestParams);
      }

      const transformedAdSets: IAdSet[] = adSets.map((adSet: any) => ({
        id: adSet.id,
        campaignId: adSet.campaign_id,
        name: adSet.name,
        status: adSet.status === 'ACTIVE' ? 'active' : 'paused',
        budget: {
          amount: adSet.daily_budget ? adSet.daily_budget / 100 : adSet.lifetime_budget / 100,
          type: adSet.daily_budget ? 'daily' : 'lifetime'
        },
        bidAmount: adSet.bid_amount ? adSet.bid_amount / 100 : undefined,
        targeting: this.convertTargetingFromFacebook(adSet.targeting),
        createdAt: adSet.created_time ? new Date(adSet.created_time) : undefined
      }));

      return { 
        success: true, 
        data: transformedAdSets,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: transformedAdSets.length === (params?.pageSize || 50)
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get ad sets');
    }
  }

  async deleteAdSet(adSetId: string): Promise<ConnectorResponse<void>> {
    try {
      const adSet = new AdSet(adSetId);
      await adSet.update([], { status: 'DELETED' });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete ad set');
    }
  }

  async createAd(ad: Omit<Advertisement, 'id'>): Promise<ConnectorResponse<Advertisement>> {
    try {
      const adData: Partial<FacebookAd> = {
        adset_id: ad.adSetId,
        name: ad.name,
        status: ad.status === 'active' ? 'ACTIVE' : 'PAUSED'
      };

      if (ad.creative) {
        adData.creative = {
          object_story_spec: {
            page_id: 'YOUR_PAGE_ID', // This should come from configuration
            link_data: {
              message: ad.creative.description,
              name: ad.creative.title,
              link: ad.creative.destinationUrl,
              call_to_action: {
                type: this.mapCallToAction(ad.creative.callToAction || 'LEARN_MORE')
              }
            }
          }
        };
      }

      const fbAd = await this.adAccount.createAd([], adData);

      const transformedAd: Advertisement = {
        id: fbAd.id,
        adSetId: ad.adSetId,
        name: ad.name,
        status: ad.status,
        creative: ad.creative,
        createdAt: new Date()
      };

      return { success: true, data: transformedAd };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create ad');
    }
  }

  async updateAd(adId: string, updates: Partial<Advertisement>): Promise<ConnectorResponse<Advertisement>> {
    try {
      const ad = new Ad(adId);
      const updateData: any = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.status) updateData.status = updates.status === 'active' ? 'ACTIVE' : 'PAUSED';

      await ad.update([], updateData);

      const transformedAd: Advertisement = {
        id: adId,
        adSetId: updates.adSetId || '',
        name: updates.name || '',
        status: updates.status,
        creative: updates.creative || {}
      };

      return { success: true, data: transformedAd };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update ad');
    }
  }

  async getAd(adId: string): Promise<ConnectorResponse<Advertisement>> {
    try {
      const ad = new Ad(adId);
      const result = await ad.read([
        'id', 'adset_id', 'name', 'status', 'creative', 'created_time', 'updated_time'
      ]);

      const transformedAd: Advertisement = {
        id: result.id,
        adSetId: result.adset_id,
        name: result.name,
        status: this.mapStatusFromFacebook(result.status),
        creative: this.extractCreativeFromFacebook(result.creative),
        createdAt: result.created_time ? new Date(result.created_time) : undefined
      };

      return { success: true, data: transformedAd };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get ad');
    }
  }

  async getAds(adSetId?: string, params?: PaginatedRequest): Promise<ConnectorResponse<Advertisement[]>> {
    try {
      const requestParams: any = {
        limit: params?.pageSize || 50
      };

      if (params?.page && params.page > 1) {
        requestParams.after = `page_${params.page}`;
      }

      let ads: any[];
      
      if (adSetId) {
        const adSet = new AdSet(adSetId);
        ads = await adSet.getAds([
          'id', 'adset_id', 'name', 'status', 'creative', 'created_time', 'updated_time'
        ], requestParams);
      } else {
        ads = await this.adAccount.getAds([
          'id', 'adset_id', 'name', 'status', 'creative', 'created_time', 'updated_time'
        ], requestParams);
      }

      const transformedAds: Advertisement[] = ads.map((ad: any) => ({
        id: ad.id,
        adSetId: ad.adset_id,
        name: ad.name,
        status: this.mapStatusFromFacebook(ad.status),
        creative: this.extractCreativeFromFacebook(ad.creative),
        createdAt: ad.created_time ? new Date(ad.created_time) : undefined
      }));

      return { 
        success: true, 
        data: transformedAds,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: transformedAds.length === (params?.pageSize || 50)
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get ads');
    }
  }

  async deleteAd(adId: string): Promise<ConnectorResponse<void>> {
    try {
      const ad = new Ad(adId);
      await ad.update([], { status: 'DELETED' });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete ad');
    }
  }

  async pauseAd(adId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.updateAd(adId, { status: 'paused' });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to pause ad');
    }
  }

  async resumeAd(adId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.updateAd(adId, { status: 'active' });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to resume ad');
    }
  }

  async createAudience(audience: Omit<Audience, 'id'>): Promise<ConnectorResponse<Audience>> {
    try {
      const audienceData: Partial<FacebookCustomAudience> = {
        name: audience.name,
        description: audience.description,
        subtype: this.mapAudienceTypeToFacebook(audience.type) as any,
        customer_file_source: 'USER_PROVIDED_ONLY'
      };

      if (audience.type === 'lookalike' && audience.criteria?.sourceAudienceId) {
        audienceData.lookalike_spec = {
          ratio: audience.criteria.ratio || 0.01,
          country: audience.criteria.country || 'US'
        };
      }

      const fbAudience = await this.adAccount.createCustomAudience([], audienceData);

      const transformedAudience: Audience = {
        id: fbAudience.id,
        name: audience.name,
        description: audience.description,
        type: audience.type,
        size: 0, // Will be populated once audience is ready
        isReady: false,
        createdAt: new Date()
      };

      return { success: true, data: transformedAudience };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create audience');
    }
  }

  async updateAudience(audienceId: string, updates: Partial<Audience>): Promise<ConnectorResponse<Audience>> {
    try {
      const audience = new CustomAudience(audienceId);
      const updateData: any = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.description = updates.description;

      await audience.update([], updateData);

      const transformedAudience: Audience = {
        id: audienceId,
        name: updates.name || '',
        description: updates.description,
        type: updates.type as 'saved' | 'custom' | 'lookalike',
        size: updates.size
      };

      return { success: true, data: transformedAudience };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update audience');
    }
  }

  async getAudience(audienceId: string): Promise<ConnectorResponse<Audience>> {
    try {
      const audience = new CustomAudience(audienceId);
      const result = await audience.read([
        'id', 'name', 'description', 'subtype', 'approximate_count',
        'delivery_status', 'operation_status', 'time_created'
      ]);

      const transformedAudience: Audience = {
        id: result.id,
        name: result.name,
        description: result.description,
        type: this.mapAudienceTypeFromFacebook(result.subtype),
        size: result.approximate_count || 0,
        isReady: result.delivery_status?.code === 200,
        createdAt: result.time_created ? new Date(result.time_created * 1000) : undefined
      };

      return { success: true, data: transformedAudience };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get audience');
    }
  }

  async getAudiences(params?: PaginatedRequest): Promise<ConnectorResponse<Audience[]>> {
    try {
      const requestParams: any = {
        limit: params?.pageSize || 50
      };

      if (params?.page && params.page > 1) {
        requestParams.after = `page_${params.page}`;
      }

      const audiences = await this.adAccount.getCustomAudiences([
        'id', 'name', 'description', 'subtype', 'approximate_count',
        'delivery_status', 'operation_status', 'time_created'
      ], requestParams);

      const transformedAudiences: Audience[] = audiences.map((audience: any) => ({
        id: audience.id,
        name: audience.name,
        description: audience.description,
        type: this.mapAudienceTypeFromFacebook(audience.subtype),
        size: audience.approximate_count || 0,
        isReady: audience.delivery_status?.code === 200,
        createdAt: audience.time_created ? new Date(audience.time_created * 1000) : undefined
      }));

      return { 
        success: true, 
        data: transformedAudiences,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: transformedAudiences.length === (params?.pageSize || 50)
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get audiences');
    }
  }

  async deleteAudience(audienceId: string): Promise<ConnectorResponse<void>> {
    try {
      const audience = new CustomAudience(audienceId);
      await audience.delete();
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete audience');
    }
  }

  async getCampaignPerformance(campaignId: string, dateRange?: { startDate: Date; endDate: Date }): Promise<ConnectorResponse<AdPerformance>> {
    try {
      const params: any = {
        time_range: this.formatDateRange(dateRange),
        fields: [
          'impressions', 'clicks', 'actions', 'spend', 'cpm', 'cpc', 'cpa',
          'ctr', 'conversion_rate_ranking', 'cost_per_action_type'
        ]
      };

      const campaign = new Campaign(campaignId);
      const insights = await campaign.getInsights([], params);

      if (!insights || insights.length === 0) {
        throw new Error('No performance data found for campaign');
      }

      const insight = insights[0];
      const conversions = this.extractConversions(insight.actions);

      const performance: AdPerformance = {
        impressions: parseInt(insight.impressions) || 0,
        clicks: parseInt(insight.clicks) || 0,
        conversions: conversions,
        spend: parseFloat(insight.spend) || 0,
        cpm: parseFloat(insight.cpm) || 0,
        cpc: parseFloat(insight.cpc) || 0,
        cpa: this.calculateCPA(insight.cost_per_action_type),
        ctr: parseFloat(insight.ctr) || 0,
        conversionRate: conversions > 0 && insight.clicks > 0 ? (conversions / parseInt(insight.clicks)) * 100 : 0
      };

      return { success: true, data: performance };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get campaign performance');
    }
  }

  async getAdSetPerformance(adSetId: string, dateRange?: { startDate: Date; endDate: Date }): Promise<ConnectorResponse<AdPerformance>> {
    try {
      const params: any = {
        time_range: this.formatDateRange(dateRange),
        fields: [
          'impressions', 'clicks', 'actions', 'spend', 'cpm', 'cpc', 'cpa',
          'ctr', 'conversion_rate_ranking', 'cost_per_action_type'
        ]
      };

      const adSet = new AdSet(adSetId);
      const insights = await adSet.getInsights([], params);

      if (!insights || insights.length === 0) {
        throw new Error('No performance data found for ad set');
      }

      const insight = insights[0];
      const conversions = this.extractConversions(insight.actions);

      const performance: AdPerformance = {
        impressions: parseInt(insight.impressions) || 0,
        clicks: parseInt(insight.clicks) || 0,
        conversions: conversions,
        spend: parseFloat(insight.spend) || 0,
        cpm: parseFloat(insight.cpm) || 0,
        cpc: parseFloat(insight.cpc) || 0,
        cpa: this.calculateCPA(insight.cost_per_action_type),
        ctr: parseFloat(insight.ctr) || 0,
        conversionRate: conversions > 0 && insight.clicks > 0 ? (conversions / parseInt(insight.clicks)) * 100 : 0
      };

      return { success: true, data: performance };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get ad set performance');
    }
  }

  async getAdPerformance(adId: string, dateRange?: { startDate: Date; endDate: Date }): Promise<ConnectorResponse<AdPerformance>> {
    try {
      const params: any = {
        time_range: this.formatDateRange(dateRange),
        fields: [
          'impressions', 'clicks', 'actions', 'spend', 'cpm', 'cpc', 'cpa',
          'ctr', 'conversion_rate_ranking', 'cost_per_action_type'
        ]
      };

      const ad = new Ad(adId);
      const insights = await ad.getInsights([], params);

      if (!insights || insights.length === 0) {
        throw new Error('No performance data found for ad');
      }

      const insight = insights[0];
      const conversions = this.extractConversions(insight.actions);

      const performance: AdPerformance = {
        impressions: parseInt(insight.impressions) || 0,
        clicks: parseInt(insight.clicks) || 0,
        conversions: conversions,
        spend: parseFloat(insight.spend) || 0,
        cpm: parseFloat(insight.cpm) || 0,
        cpc: parseFloat(insight.cpc) || 0,
        cpa: this.calculateCPA(insight.cost_per_action_type),
        ctr: parseFloat(insight.ctr) || 0,
        conversionRate: conversions > 0 && insight.clicks > 0 ? (conversions / parseInt(insight.clicks)) * 100 : 0
      };

      return { success: true, data: performance };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get ad performance');
    }
  }

  async getAccountPerformance(dateRange?: { startDate: Date; endDate: Date }): Promise<ConnectorResponse<AdPerformance>> {
    try {
      const params: any = {
        time_range: this.formatDateRange(dateRange),
        fields: [
          'impressions', 'clicks', 'actions', 'spend', 'cpm', 'cpc', 'cpa',
          'ctr', 'conversion_rate_ranking', 'cost_per_action_type'
        ]
      };

      const insights = await this.adAccount.getInsights([], params);

      if (!insights || insights.length === 0) {
        throw new Error('No performance data found for account');
      }

      const insight = insights[0];
      const conversions = this.extractConversions(insight.actions);

      const performance: AdPerformance = {
        impressions: parseInt(insight.impressions) || 0,
        clicks: parseInt(insight.clicks) || 0,
        conversions: conversions,
        spend: parseFloat(insight.spend) || 0,
        cpm: parseFloat(insight.cpm) || 0,
        cpc: parseFloat(insight.cpc) || 0,
        cpa: this.calculateCPA(insight.cost_per_action_type),
        ctr: parseFloat(insight.ctr) || 0,
        conversionRate: conversions > 0 && insight.clicks > 0 ? (conversions / parseInt(insight.clicks)) * 100 : 0
      };

      return { success: true, data: performance };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get account performance');
    }
  }

  async updateCampaignBudget(campaignId: string, budget: { amount: number; type: 'daily' | 'lifetime' }): Promise<ConnectorResponse<void>> {
    try {
      await this.updateAdCampaign(campaignId, { budget });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update campaign budget');
    }
  }

  async getAccountBudget(): Promise<ConnectorResponse<{ balance: number; currency: string }>> {
    try {
      const account = await this.adAccount.read(['balance', 'currency']);
      
      const accountBudget = {
        balance: account.balance || 0,
        currency: account.currency || 'USD'
      };

      return { success: true, data: accountBudget };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get account budget');
    }
  }

  // Helper methods
  private mapObjectiveToFacebook(objective?: string): string {
    const mapping: Record<string, string> = {
      'BRAND_AWARENESS': 'BRAND_AWARENESS',
      'REACH': 'REACH',
      'TRAFFIC': 'LINK_CLICKS',
      'ENGAGEMENT': 'POST_ENGAGEMENT',
      'APP_INSTALLS': 'APP_INSTALLS',
      'VIDEO_VIEWS': 'VIDEO_VIEWS',
      'LEAD_GENERATION': 'LEAD_GENERATION',
      'MESSAGES': 'MESSAGES',
      'CONVERSIONS': 'CONVERSIONS',
      'CATALOG_SALES': 'CATALOG_SALES',
      'STORE_VISITS': 'STORE_VISITS'
    };
    return mapping[objective || 'LINK_CLICKS'] || 'LINK_CLICKS';
  }

  private mapObjectiveFromFacebook(objective: string): string {
    const mapping: Record<string, string> = {
      'BRAND_AWARENESS': 'BRAND_AWARENESS',
      'REACH': 'REACH',
      'LINK_CLICKS': 'TRAFFIC',
      'POST_ENGAGEMENT': 'ENGAGEMENT',
      'APP_INSTALLS': 'APP_INSTALLS',
      'VIDEO_VIEWS': 'VIDEO_VIEWS',
      'LEAD_GENERATION': 'LEAD_GENERATION',
      'MESSAGES': 'MESSAGES',
      'CONVERSIONS': 'CONVERSIONS',
      'CATALOG_SALES': 'CATALOG_SALES',
      'STORE_VISITS': 'STORE_VISITS'
    };
    return mapping[objective] || 'TRAFFIC';
  }

  private mapStatusFromFacebook(status: string): 'active' | 'paused' | 'deleted' | 'pending_review' | 'disapproved' {
    const mapping: Record<string, any> = {
      'ACTIVE': 'active',
      'PAUSED': 'paused',
      'DELETED': 'deleted',
      'ARCHIVED': 'deleted',
      'PENDING_REVIEW': 'pending_review',
      'DISAPPROVED': 'disapproved',
      'PREAPPROVED': 'active',
      'PENDING_BILLING_INFO': 'paused',
      'CAMPAIGN_PAUSED': 'paused',
      'ADSET_PAUSED': 'paused'
    };
    return mapping[status] || 'paused';
  }

  private mapCallToAction(cta: string): string {
    const mapping: Record<string, string> = {
      'LEARN_MORE': 'LEARN_MORE',
      'SHOP_NOW': 'SHOP_NOW',
      'DOWNLOAD': 'DOWNLOAD',
      'SIGN_UP': 'SIGN_UP',
      'CONTACT_US': 'CONTACT_US',
      'CALL_NOW': 'CALL_NOW'
    };
    return mapping[cta] || 'LEARN_MORE';
  }

  private mapAudienceTypeToFacebook(type: string): string {
    const mapping: Record<string, string> = {
      'custom': 'CUSTOM',
      'website': 'WEBSITE',
      'lookalike': 'LOOKALIKE'
    };
    return mapping[type] || 'CUSTOM';
  }

  private mapAudienceTypeFromFacebook(subtype: string): 'saved' | 'custom' | 'lookalike' {
    const mapping: Record<string, any> = {
      'CUSTOM': 'custom',
      'WEBSITE': 'custom',
      'APP': 'custom',
      'LOOKALIKE': 'lookalike',
      'ENGAGEMENT': 'custom',
      'VIDEO': 'custom'
    };
    return mapping[subtype] || 'custom';
  }

  private convertTargeting(targeting: any): any {
    // Convert our generic targeting format to Facebook's format
    const fbTargeting: any = {};

    if (targeting.locations) {
      fbTargeting.geo_locations = {
        countries: targeting.locations
      };
    }

    if (targeting.demographics) {
      if (targeting.demographics.ageMin) fbTargeting.age_min = targeting.demographics.ageMin;
      if (targeting.demographics.ageMax) fbTargeting.age_max = targeting.demographics.ageMax;
      if (targeting.demographics.gender) fbTargeting.genders = [targeting.demographics.gender];
    }

    if (targeting.interests) {
      fbTargeting.interests = targeting.interests.map((interest: string) => ({ name: interest }));
    }

    if (targeting.customAudiences) {
      fbTargeting.custom_audiences = targeting.customAudiences.map((audience: string) => ({ id: audience }));
    }

    return fbTargeting;
  }

  private convertTargetingFromFacebook(targeting: any): any {
    if (!targeting) return undefined;

    const genericTargeting: any = {};

    if (targeting.geo_locations?.countries) {
      genericTargeting.locations = targeting.geo_locations.countries;
    }

    if (targeting.age_min || targeting.age_max || targeting.genders) {
      genericTargeting.demographics = {};
      if (targeting.age_min) genericTargeting.demographics.ageMin = targeting.age_min;
      if (targeting.age_max) genericTargeting.demographics.ageMax = targeting.age_max;
      if (targeting.genders?.length) genericTargeting.demographics.gender = targeting.genders[0];
    }

    if (targeting.interests) {
      genericTargeting.interests = targeting.interests.map((interest: any) => interest.name);
    }

    if (targeting.custom_audiences) {
      genericTargeting.customAudiences = targeting.custom_audiences.map((audience: any) => audience.id);
    }

    return genericTargeting;
  }

  private extractCreativeFromFacebook(creative: any): any {
    if (!creative || !creative.object_story_spec) return undefined;

    const linkData = creative.object_story_spec.link_data;
    const videoData = creative.object_story_spec.video_data;

    return {
      title: linkData?.name || videoData?.title,
      description: linkData?.message || videoData?.message,
      imageUrl: linkData?.image_hash,
      videoUrl: videoData?.video_id,
      destinationUrl: linkData?.link || videoData?.call_to_action?.value?.link,
      callToAction: linkData?.call_to_action?.type || videoData?.call_to_action?.type
    };
  }

  private formatDateRange(dateRange?: { startDate: Date; endDate: Date }): any {
    if (!dateRange) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      
      return {
        since: startDate.toISOString().split('T')[0],
        until: endDate.toISOString().split('T')[0]
      };
    }

    return {
      since: dateRange.startDate.toISOString().split('T')[0],
      until: dateRange.endDate.toISOString().split('T')[0]
    };
  }

  private extractConversions(actions: any[]): number {
    if (!actions || !Array.isArray(actions)) return 0;

    return actions.reduce((total, action) => {
      if (action.action_type === 'purchase' || action.action_type === 'lead' || action.action_type === 'complete_registration') {
        return total + parseInt(action.value || '0');
      }
      return total;
    }, 0);
  }

  private calculateCPA(costPerActionType: any[]): number {
    if (!costPerActionType || !Array.isArray(costPerActionType)) return 0;

    const conversionAction = costPerActionType.find(action => 
      action.action_type === 'purchase' || action.action_type === 'lead' || action.action_type === 'complete_registration'
    );

    return conversionAction ? parseFloat(conversionAction.value || '0') : 0;
  }
}