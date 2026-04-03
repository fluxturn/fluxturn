import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import mailchimp from '@mailchimp/mailchimp_marketing';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorMetadata,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  PaginatedRequest,
  BulkOperation,
  BulkOperationResult
} from '../../types';
import {
  IMarketingConnector,
  MarketingContact,
  MarketingList,
  MarketingSegment,
  EmailCampaign,
  EmailTemplate,
  CampaignStats,
  ABTest
} from '../marketing.interface';

interface MailchimpConfig {
  apiKey: string;
  server?: string; // e.g., 'us1', 'us2', etc. - extracted from apiKey suffix if not provided
}

// MD5 hash function for email to subscriber hash
import * as crypto from 'crypto';

function getSubscriberHash(email: string): string {
  return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
}

function extractServerFromApiKey(apiKey: string): string {
  const parts = apiKey.split('-');
  return parts.length > 1 ? parts[parts.length - 1] : 'us1';
}

interface MailchimpMember {
  id?: string;
  email_address: string;
  email_type?: string;
  status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending';
  merge_fields?: Record<string, any>;
  interests?: Record<string, boolean>;
  stats?: any;
  ip_signup?: string;
  timestamp_signup?: string;
  ip_opt?: string;
  timestamp_opt?: string;
  member_rating?: number;
  last_changed?: string;
  language?: string;
  vip?: boolean;
  email_client?: string;
  location?: any;
  source?: string;
  tags_count?: number;
  tags?: Array<{ id: number; name: string }>;
}

interface MailchimpList {
  id?: string;
  web_id?: number;
  name: string;
  contact?: {
    company: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  permission_reminder: string;
  use_archive_bar?: boolean;
  campaign_defaults: {
    from_name: string;
    from_email: string;
    subject: string;
    language: string;
  };
  notify_on_subscribe?: string;
  notify_on_unsubscribe?: string;
  date_created?: string;
  list_rating?: number;
  email_type_option?: boolean;
  subscribe_url_short?: string;
  subscribe_url_long?: string;
  beamer_address?: string;
  visibility?: 'pub' | 'prv';
  double_optin?: boolean;
  has_welcome?: boolean;
  marketing_permissions?: boolean;
  modules?: string[];
  stats?: {
    member_count: number;
    total_contacts: number;
    unsubscribe_count: number;
    cleaned_count: number;
    member_count_since_send: number;
    unsubscribe_count_since_send: number;
    cleaned_count_since_send: number;
    campaign_count: number;
    campaign_last_sent: string;
    merge_field_count: number;
    avg_sub_rate: number;
    avg_unsub_rate: number;
    target_sub_rate: number;
    open_rate: number;
    click_rate: number;
    last_sub_date: string;
    last_unsub_date: string;
  };
}

interface MailchimpCampaign {
  id?: string;
  web_id?: number;
  type: 'regular' | 'plaintext' | 'absplit' | 'rss' | 'variate';
  create_time?: string;
  archive_url?: string;
  long_archive_url?: string;
  status?: 'save' | 'paused' | 'schedule' | 'sending' | 'sent';
  emails_sent?: number;
  send_time?: string;
  content_type?: string;
  needs_block_refresh?: boolean;
  resendable?: boolean;
  recipients: {
    list_id: string;
    list_is_active?: boolean;
    list_name?: string;
    segment_text?: string;
    recipient_count?: number;
    segment_opts?: any;
  };
  settings: {
    subject_line: string;
    preview_text?: string;
    title?: string;
    from_name: string;
    reply_to: string;
    use_conversation?: boolean;
    to_name?: string;
    folder_id?: string;
    authenticate?: boolean;
    auto_footer?: boolean;
    inline_css?: boolean;
    auto_tweet?: boolean;
    auto_fb_post?: string[];
    fb_comments?: boolean;
    timewarp?: boolean;
    template_id?: number;
    drag_and_drop?: boolean;
  };
  variate_settings?: any;
  tracking?: {
    opens?: boolean;
    html_clicks?: boolean;
    text_clicks?: boolean;
    goal_tracking?: boolean;
    ecomm360?: boolean;
    google_analytics?: string;
    clicktale?: string;
    salesforce?: any;
    capsule?: any;
  };
  rss_opts?: any;
  ab_split_opts?: any;
  social_card?: any;
  report_summary?: any;
  delivery_status?: any;
}

@Injectable()
export class MailchimpConnector extends BaseConnector implements IMarketingConnector {
  private client: typeof mailchimp;

  constructor() {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Mailchimp',
      description: 'Email marketing and automation platform',
      version: '1.0.0',
      category: ConnectorCategory.MARKETING,
      type: ConnectorType.MAILCHIMP,
      logoUrl: 'https://mailchimp.com/release/plums/cxp/images/apple-touch-icon-192.png',
      documentationUrl: 'https://mailchimp.com/developer/',
      authType: AuthType.API_KEY,
      requiredScopes: [],
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600
      },
      actions: [
        // Member actions
        {
          id: 'create_member',
          name: 'Create Member',
          description: 'Add a new subscriber to a list',
          inputSchema: {
            listId: { type: 'string', required: true },
            email: { type: 'string', required: true },
            status: { type: 'string', required: false }
          },
          outputSchema: {
            id: { type: 'string' },
            email_address: { type: 'string' },
            status: { type: 'string' }
          }
        },
        {
          id: 'create_contact',
          name: 'Create Contact',
          description: 'Add a new subscriber to a list (alias for create_member)',
          inputSchema: {
            listId: { type: 'string', required: true },
            email: { type: 'string', required: true },
            status: { type: 'string', required: false }
          },
          outputSchema: {
            id: { type: 'string' },
            email_address: { type: 'string' },
            status: { type: 'string' }
          }
        },
        {
          id: 'get_member',
          name: 'Get Member',
          description: 'Get a member by email address',
          inputSchema: {
            listId: { type: 'string', required: true },
            email: { type: 'string', required: true }
          },
          outputSchema: {
            id: { type: 'string' },
            email_address: { type: 'string' },
            status: { type: 'string' }
          }
        },
        {
          id: 'get_all_members',
          name: 'Get All Members',
          description: 'Get all members from a list',
          inputSchema: {
            listId: { type: 'string', required: true },
            status: { type: 'string', required: false },
            limit: { type: 'number', required: false }
          },
          outputSchema: {
            members: { type: 'array' },
            total_items: { type: 'number' }
          }
        },
        {
          id: 'update_member',
          name: 'Update Member',
          description: 'Update a member in a list',
          inputSchema: {
            listId: { type: 'string', required: true },
            email: { type: 'string', required: true },
            status: { type: 'string', required: false }
          },
          outputSchema: {
            id: { type: 'string' },
            email_address: { type: 'string' },
            status: { type: 'string' }
          }
        },
        {
          id: 'delete_member',
          name: 'Delete Member',
          description: 'Delete a member from a list',
          inputSchema: {
            listId: { type: 'string', required: true },
            email: { type: 'string', required: true }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        // Tag actions
        {
          id: 'add_member_tags',
          name: 'Add Member Tags',
          description: 'Add tags to a member',
          inputSchema: {
            listId: { type: 'string', required: true },
            email: { type: 'string', required: true },
            tags: { type: 'array', required: true }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        {
          id: 'remove_member_tags',
          name: 'Remove Member Tags',
          description: 'Remove tags from a member',
          inputSchema: {
            listId: { type: 'string', required: true },
            email: { type: 'string', required: true },
            tags: { type: 'array', required: true }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        // Campaign actions
        {
          id: 'get_campaign',
          name: 'Get Campaign',
          description: 'Get a campaign by ID',
          inputSchema: {
            campaignId: { type: 'string', required: true }
          },
          outputSchema: {
            id: { type: 'string' },
            status: { type: 'string' }
          }
        },
        {
          id: 'get_all_campaigns',
          name: 'Get All Campaigns',
          description: 'Get all campaigns',
          inputSchema: {
            status: { type: 'string', required: false },
            limit: { type: 'number', required: false }
          },
          outputSchema: {
            campaigns: { type: 'array' },
            total_items: { type: 'number' }
          }
        },
        {
          id: 'create_campaign',
          name: 'Create Campaign',
          description: 'Create a new email campaign',
          inputSchema: {
            type: { type: 'string', required: true },
            listId: { type: 'string', required: true },
            subject: { type: 'string', required: true },
            fromName: { type: 'string', required: true },
            replyTo: { type: 'string', required: true }
          },
          outputSchema: {
            id: { type: 'string' },
            web_id: { type: 'number' },
            status: { type: 'string' }
          }
        },
        {
          id: 'send_campaign',
          name: 'Send Campaign',
          description: 'Send a campaign',
          inputSchema: {
            campaignId: { type: 'string', required: true }
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
        {
          id: 'replicate_campaign',
          name: 'Replicate Campaign',
          description: 'Replicate a campaign',
          inputSchema: {
            campaignId: { type: 'string', required: true }
          },
          outputSchema: {
            id: { type: 'string' },
            status: { type: 'string' }
          }
        },
        {
          id: 'resend_campaign',
          name: 'Resend Campaign',
          description: 'Resend a campaign to non-openers',
          inputSchema: {
            campaignId: { type: 'string', required: true }
          },
          outputSchema: {
            id: { type: 'string' },
            status: { type: 'string' }
          }
        },
        // List actions
        {
          id: 'get_lists',
          name: 'Get Lists',
          description: 'Get all lists/audiences',
          inputSchema: {
            limit: { type: 'number', required: false }
          },
          outputSchema: {
            lists: { type: 'array' },
            total_items: { type: 'number' }
          }
        },
        {
          id: 'get_list_groups',
          name: 'Get List Groups',
          description: 'Get interest categories for a list',
          inputSchema: {
            listId: { type: 'string', required: true }
          },
          outputSchema: {
            categories: { type: 'array' }
          }
        }
      ],
      triggers: [
        {
          id: 'subscriber_added',
          name: 'Subscriber Added',
          description: 'Triggered when a new subscriber is added',
          eventType: 'subscriber.added',
          outputSchema: {
            email: { type: 'string' },
            listId: { type: 'string' },
            timestamp: { type: 'date' }
          },
          webhookRequired: true
        },
        {
          id: 'campaign_sent',
          name: 'Campaign Sent',
          description: 'Triggered when a campaign is sent',
          eventType: 'campaign.sent',
          outputSchema: {
            campaignId: { type: 'string' },
            subject: { type: 'string' },
            timestamp: { type: 'date' }
          },
          webhookRequired: true
        }
      ],
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    const config = this.config.credentials as MailchimpConfig;

    if (!config.apiKey) {
      throw new Error('Mailchimp API key is required');
    }

    // Extract server from API key if not provided explicitly
    const server = config.server || extractServerFromApiKey(config.apiKey);

    // Configure the mailchimp client
    mailchimp.setConfig({
      apiKey: config.apiKey,
      server: server
    });

    // Store reference for use in methods
    this.client = mailchimp;

    this.logger.log(`Mailchimp client initialized successfully (server: ${server})`);
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      await this.client.ping.get();
      return true;
    } catch (error) {
      throw new Error(`Mailchimp connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.client.ping.get();
    } catch (error) {
      throw new Error(`Mailchimp health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: any): Promise<any> {
    // This method handles generic API requests if needed
    throw new Error('Generic requests not implemented for Mailchimp connector');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Member actions
      case 'create_member':
      case 'create_contact':
        return this.performCreateMember(input);
      case 'get_member':
        return this.performGetMember(input);
      case 'get_all_members':
        return this.performGetAllMembers(input);
      case 'update_member':
        return this.performUpdateMember(input);
      case 'delete_member':
        return this.performDeleteMember(input);

      // Member tag actions
      case 'add_member_tags':
        return this.performAddMemberTags(input);
      case 'remove_member_tags':
        return this.performRemoveMemberTags(input);

      // Campaign actions
      case 'get_campaign':
        return this.performGetCampaign(input);
      case 'get_all_campaigns':
        return this.performGetAllCampaigns(input);
      case 'create_campaign':
        return this.createCampaign({
          name: input.name || input.subject,
          subject: input.subject,
          fromEmail: input.replyTo,
          fromName: input.fromName,
          content: input.content || '',
          listIds: [input.listId]
        });
      case 'send_campaign':
        return this.sendCampaign(input.campaignId);
      case 'delete_campaign':
        return this.performDeleteCampaign(input);
      case 'replicate_campaign':
        return this.performReplicateCampaign(input);
      case 'resend_campaign':
        return this.performResendCampaign(input);

      // List group actions
      case 'get_list_groups':
        return this.performGetListGroups(input);

      // List actions
      case 'get_lists':
        return this.performGetLists(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  // ==========================================
  // ACTION IMPLEMENTATIONS - Matching n8n patterns
  // ==========================================

  /**
   * Create a new member/subscriber
   */
  private async performCreateMember(input: any): Promise<ConnectorResponse<any>> {
    try {
      const listId = input.listId || input.list_id;
      if (!listId) {
        throw new Error('List ID is required');
      }

      const email = input.email || input.email_address;
      if (!email) {
        throw new Error('Email is required');
      }

      const memberData: any = {
        email_address: email,
        status: input.status || 'subscribed',
        email_type: input.emailType || input.email_type || 'html'
      };

      // Add merge fields
      const mergeFields: Record<string, any> = {};
      if (input.firstName || input.first_name) {
        mergeFields.FNAME = input.firstName || input.first_name;
      }
      if (input.lastName || input.last_name) {
        mergeFields.LNAME = input.lastName || input.last_name;
      }
      if (input.birthday) {
        mergeFields.BIRTHDAY = input.birthday;
      }
      if (Object.keys(mergeFields).length > 0) {
        memberData.merge_fields = mergeFields;
      }

      // Optional fields
      if (input.language) {
        memberData.language = input.language;
      }
      if (input.vip !== undefined) {
        memberData.vip = input.vip;
      }
      if (input.latitude && input.longitude) {
        memberData.location = {
          latitude: parseFloat(input.latitude),
          longitude: parseFloat(input.longitude)
        };
      }
      if (input.ipSignup || input.ip_signup) {
        memberData.ip_signup = input.ipSignup || input.ip_signup;
      }
      if (input.ipOptIn || input.ip_opt) {
        memberData.ip_opt = input.ipOptIn || input.ip_opt;
      }
      if (input.timestampSignup || input.timestamp_signup) {
        memberData.timestamp_signup = input.timestampSignup || input.timestamp_signup;
      }
      if (input.timestampOptIn || input.timestamp_opt) {
        memberData.timestamp_opt = input.timestampOptIn || input.timestamp_opt;
      }

      const response = await this.client.lists.addListMember(listId, memberData);

      // Handle tags separately if provided
      if (input.tags) {
        const tagNames = typeof input.tags === 'string'
          ? input.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
          : input.tags;

        if (tagNames.length > 0) {
          const subscriberHash = getSubscriberHash(email);
          await this.client.lists.updateListMemberTags(listId, subscriberHash, {
            tags: tagNames.map((name: string) => ({ name, status: 'active' }))
          });
        }
      }

      return { success: true, data: response };
    } catch (error: any) {
      return this.handleError(error, 'Failed to create member');
    }
  }

  /**
   * Get a single member by email
   */
  private async performGetMember(input: any): Promise<ConnectorResponse<any>> {
    try {
      const listId = input.listId || input.list_id;
      const email = input.email || input.email_address;

      if (!listId || !email) {
        throw new Error('List ID and email are required');
      }

      const subscriberHash = getSubscriberHash(email);
      const response = await this.client.lists.getListMember(listId, subscriberHash);

      return { success: true, data: response };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get member');
    }
  }

  /**
   * Get all members from a list
   */
  private async performGetAllMembers(input: any): Promise<ConnectorResponse<any>> {
    try {
      const listId = input.listId || input.list_id;
      if (!listId) {
        throw new Error('List ID is required');
      }

      const queryParams: any = {
        count: input.limit || 100,
        offset: input.offset || 0
      };

      if (input.status) queryParams.status = input.status;
      if (input.emailType || input.email_type) queryParams.email_type = input.emailType || input.email_type;
      if (input.sinceLastChanged || input.since_last_changed) {
        queryParams.since_last_changed = input.sinceLastChanged || input.since_last_changed;
      }
      if (input.beforeLastChanged || input.before_last_changed) {
        queryParams.before_last_changed = input.beforeLastChanged || input.before_last_changed;
      }

      if (input.returnAll) {
        // Paginate through all results
        const allMembers: any[] = [];
        let offset = 0;
        const count = 500;

        while (true) {
          const response = await this.client.lists.getListMembersInfo(listId, { ...queryParams, count, offset });
          allMembers.push(...response.members);
          if (response.members.length < count) break;
          offset += count;
        }

        return { success: true, data: { members: allMembers, total_items: allMembers.length } };
      }

      const response = await this.client.lists.getListMembersInfo(listId, queryParams);
      return { success: true, data: { members: response.members, total_items: response.total_items } };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get members');
    }
  }

  /**
   * Update a member
   */
  private async performUpdateMember(input: any): Promise<ConnectorResponse<any>> {
    try {
      const listId = input.listId || input.list_id;
      const email = input.email || input.email_address;

      if (!listId || !email) {
        throw new Error('List ID and email are required');
      }

      const subscriberHash = getSubscriberHash(email);
      const updateData: any = {};

      if (input.status) updateData.status = input.status;
      if (input.emailType || input.email_type) updateData.email_type = input.emailType || input.email_type;
      if (input.language) updateData.language = input.language;
      if (input.vip !== undefined) updateData.vip = input.vip;

      // Merge fields
      const mergeFields: Record<string, any> = {};
      if (input.firstName || input.first_name) mergeFields.FNAME = input.firstName || input.first_name;
      if (input.lastName || input.last_name) mergeFields.LNAME = input.lastName || input.last_name;
      if (Object.keys(mergeFields).length > 0) {
        updateData.merge_fields = mergeFields;
      }

      const response = await this.client.lists.updateListMember(listId, subscriberHash, updateData);

      return { success: true, data: response };
    } catch (error: any) {
      return this.handleError(error, 'Failed to update member');
    }
  }

  /**
   * Delete a member
   */
  private async performDeleteMember(input: any): Promise<ConnectorResponse<any>> {
    try {
      const listId = input.listId || input.list_id;
      const email = input.email || input.email_address;

      if (!listId || !email) {
        throw new Error('List ID and email are required');
      }

      const subscriberHash = getSubscriberHash(email);
      await this.client.lists.deleteListMemberPermanent(listId, subscriberHash);

      return { success: true };
    } catch (error: any) {
      return this.handleError(error, 'Failed to delete member');
    }
  }

  /**
   * Add tags to a member
   */
  private async performAddMemberTags(input: any): Promise<ConnectorResponse<any>> {
    try {
      const listId = input.listId || input.list_id;
      const email = input.email || input.email_address;
      const tags = input.tags;

      if (!listId || !email || !tags) {
        throw new Error('List ID, email, and tags are required');
      }

      const subscriberHash = getSubscriberHash(email);
      const tagNames = typeof tags === 'string'
        ? tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        : tags;

      await this.client.lists.updateListMemberTags(listId, subscriberHash, {
        tags: tagNames.map((name: string) => ({
          name,
          status: 'active'
        })),
        is_syncing: input.isSyncing || input.is_syncing || false
      });

      return { success: true };
    } catch (error: any) {
      return this.handleError(error, 'Failed to add member tags');
    }
  }

  /**
   * Remove tags from a member
   */
  private async performRemoveMemberTags(input: any): Promise<ConnectorResponse<any>> {
    try {
      const listId = input.listId || input.list_id;
      const email = input.email || input.email_address;
      const tags = input.tags;

      if (!listId || !email || !tags) {
        throw new Error('List ID, email, and tags are required');
      }

      const subscriberHash = getSubscriberHash(email);
      const tagNames = typeof tags === 'string'
        ? tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        : tags;

      await this.client.lists.updateListMemberTags(listId, subscriberHash, {
        tags: tagNames.map((name: string) => ({
          name,
          status: 'inactive' // inactive removes the tag
        })),
        is_syncing: input.isSyncing || input.is_syncing || false
      });

      return { success: true };
    } catch (error: any) {
      return this.handleError(error, 'Failed to remove member tags');
    }
  }

  /**
   * Get a single campaign
   */
  private async performGetCampaign(input: any): Promise<ConnectorResponse<any>> {
    try {
      const campaignId = input.campaignId || input.campaign_id;
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }

      const response = await this.client.campaigns.get(campaignId);
      return { success: true, data: response };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get campaign');
    }
  }

  /**
   * Get all campaigns
   */
  private async performGetAllCampaigns(input: any): Promise<ConnectorResponse<any>> {
    try {
      const queryParams: any = {
        count: input.limit || 10,
        offset: input.offset || 0
      };

      if (input.status) queryParams.status = input.status;
      if (input.listId || input.list_id) queryParams.list_id = input.listId || input.list_id;
      if (input.sinceCreateTime || input.since_create_time) {
        queryParams.since_create_time = input.sinceCreateTime || input.since_create_time;
      }
      if (input.beforeCreateTime || input.before_create_time) {
        queryParams.before_create_time = input.beforeCreateTime || input.before_create_time;
      }
      if (input.sinceSendTime || input.since_send_time) {
        queryParams.since_send_time = input.sinceSendTime || input.since_send_time;
      }
      if (input.beforeSendTime || input.before_send_time) {
        queryParams.before_send_time = input.beforeSendTime || input.before_send_time;
      }
      if (input.sortField || input.sort_field) {
        queryParams.sort_field = input.sortField || input.sort_field;
      }
      if (input.sortDirection || input.sort_dir) {
        queryParams.sort_dir = input.sortDirection || input.sort_dir;
      }

      if (input.returnAll) {
        const allCampaigns: any[] = [];
        let offset = 0;
        const count = 500;

        while (true) {
          const response = await this.client.campaigns.list({ ...queryParams, count, offset });
          allCampaigns.push(...response.campaigns);
          if (response.campaigns.length < count) break;
          offset += count;
        }

        return { success: true, data: { campaigns: allCampaigns, total_items: allCampaigns.length } };
      }

      const response = await this.client.campaigns.list(queryParams);
      return { success: true, data: { campaigns: response.campaigns, total_items: response.total_items } };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get campaigns');
    }
  }

  /**
   * Delete a campaign
   */
  private async performDeleteCampaign(input: any): Promise<ConnectorResponse<any>> {
    try {
      const campaignId = input.campaignId || input.campaign_id;
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }

      await this.client.campaigns.remove(campaignId);
      return { success: true };
    } catch (error: any) {
      return this.handleError(error, 'Failed to delete campaign');
    }
  }

  /**
   * Replicate (copy) a campaign
   */
  private async performReplicateCampaign(input: any): Promise<ConnectorResponse<any>> {
    try {
      const campaignId = input.campaignId || input.campaign_id;
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }

      const response = await this.client.campaigns.replicate(campaignId);
      return { success: true, data: response };
    } catch (error: any) {
      return this.handleError(error, 'Failed to replicate campaign');
    }
  }

  /**
   * Create a resend to non-openers version of a campaign
   */
  private async performResendCampaign(input: any): Promise<ConnectorResponse<any>> {
    try {
      const campaignId = input.campaignId || input.campaign_id;
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }

      const response = await this.client.campaigns.createResend(campaignId);
      return { success: true, data: response };
    } catch (error: any) {
      return this.handleError(error, 'Failed to resend campaign');
    }
  }

  /**
   * Get list groups (interest categories)
   */
  private async performGetListGroups(input: any): Promise<ConnectorResponse<any>> {
    try {
      const listId = input.listId || input.list_id;
      const categoryId = input.categoryId || input.category_id;

      if (!listId || !categoryId) {
        throw new Error('List ID and category ID are required');
      }

      const queryParams: any = {
        count: input.limit || 100,
        offset: input.offset || 0
      };

      if (input.returnAll) {
        const allInterests: any[] = [];
        let offset = 0;
        const count = 500;

        while (true) {
          const response = await this.client.lists.listInterestCategoryInterests(listId, categoryId, { count, offset });
          allInterests.push(...response.interests);
          if (response.interests.length < count) break;
          offset += count;
        }

        return { success: true, data: allInterests };
      }

      const response = await this.client.lists.listInterestCategoryInterests(listId, categoryId, queryParams);
      return { success: true, data: response.interests };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get list groups');
    }
  }

  /**
   * Get all lists/audiences
   */
  private async performGetLists(input: any): Promise<ConnectorResponse<any>> {
    try {
      const queryParams: any = {
        count: input.limit || 100,
        offset: input.offset || 0
      };

      if (input.returnAll) {
        const allLists: any[] = [];
        let offset = 0;
        const count = 500;

        while (true) {
          const response = await this.client.lists.getAllLists({ count, offset });
          allLists.push(...response.lists);
          if (response.lists.length < count) break;
          offset += count;
        }

        return { success: true, data: allLists };
      }

      const response = await this.client.lists.getAllLists(queryParams);
      return { success: true, data: response.lists };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get lists');
    }
  }

  protected async cleanup(): Promise<void> {
    this.client = null;
  }

  // IMarketingConnector implementation

  async createContact(contact: Omit<MarketingContact, 'id'>): Promise<ConnectorResponse<MarketingContact>> {
    try {
      const listId = contact.customFields?.listId;
      if (!listId) {
        throw new Error('List ID is required for Mailchimp contacts');
      }

      const memberData: Partial<MailchimpMember> = {
        email_address: contact.email,
        status: contact.status as any || 'subscribed',
        merge_fields: {
          FNAME: contact.firstName || '',
          LNAME: contact.lastName || '',
          PHONE: contact.phone || '',
          ...contact.customFields
        }
      };

      if (contact.tags && contact.tags.length > 0) {
        memberData.tags = contact.tags.map(tag => ({ id: 0, name: tag, status: 'active' }));
      }

      const response = await this.client.lists.addListMember(listId, memberData);

      const transformedContact: MarketingContact = {
        id: response.id,
        email: response.email_address,
        firstName: response.merge_fields?.FNAME,
        lastName: response.merge_fields?.LNAME,
        phone: response.merge_fields?.PHONE,
        status: response.status as any,
        tags: response.tags?.map((tag: any) => tag.name) || [],
        customFields: response.merge_fields,
        createdAt: response.timestamp_signup ? new Date(response.timestamp_signup) : undefined,
        updatedAt: response.last_changed ? new Date(response.last_changed) : undefined
      };

      return { success: true, data: transformedContact };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create contact');
    }
  }

  async updateContact(contactId: string, updates: Partial<MarketingContact>): Promise<ConnectorResponse<MarketingContact>> {
    try {
      const listId = updates.customFields?.listId;
      if (!listId) {
        throw new Error('List ID is required for updating Mailchimp contacts');
      }

      const updateData: any = {};
      
      if (updates.firstName || updates.lastName || updates.phone) {
        updateData.merge_fields = {};
        if (updates.firstName) updateData.merge_fields.FNAME = updates.firstName;
        if (updates.lastName) updateData.merge_fields.LNAME = updates.lastName;
        if (updates.phone) updateData.merge_fields.PHONE = updates.phone;
      }

      if (updates.status) {
        updateData.status = updates.status;
      }

      if (updates.tags) {
        // Mailchimp requires separate API calls for tag management
        await this.client.lists.updateListMemberTags(listId, contactId, {
          tags: updates.tags.map(tag => ({ name: tag, status: 'active' }))
        });
      }

      const response = await this.client.lists.updateListMember(listId, contactId, updateData);

      const transformedContact: MarketingContact = {
        id: response.id,
        email: response.email_address,
        firstName: response.merge_fields?.FNAME,
        lastName: response.merge_fields?.LNAME,
        phone: response.merge_fields?.PHONE,
        status: response.status as any,
        tags: response.tags?.map((tag: any) => tag.name) || [],
        customFields: response.merge_fields,
        updatedAt: new Date()
      };

      return { success: true, data: transformedContact };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update contact');
    }
  }

  async getContact(contactId: string): Promise<ConnectorResponse<MarketingContact>> {
    try {
      // Note: Mailchimp requires listId to get a member, we'd need to store this mapping
      throw new Error('Getting contact by ID requires list ID in Mailchimp. Use getContacts with email filter instead.');
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contact');
    }
  }

  async getContacts(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingContact[]>> {
    try {
      const listId = params?.filters?.listId;
      if (!listId) {
        throw new Error('List ID is required to get contacts from Mailchimp');
      }

      const queryParams: any = {
        count: params?.pageSize || 50,
        offset: ((params?.page || 1) - 1) * (params?.pageSize || 50)
      };

      if (params?.filters?.status) {
        queryParams.status = params.filters.status;
      }

      const response = await this.client.lists.getListMembersInfo(listId, queryParams);

      const contacts: MarketingContact[] = response.members.map((member: MailchimpMember) => ({
        id: member.id,
        email: member.email_address,
        firstName: member.merge_fields?.FNAME,
        lastName: member.merge_fields?.LNAME,
        phone: member.merge_fields?.PHONE,
        status: member.status as any,
        tags: member.tags?.map((tag: any) => tag.name) || [],
        customFields: member.merge_fields,
        createdAt: member.timestamp_signup ? new Date(member.timestamp_signup) : undefined,
        updatedAt: member.last_changed ? new Date(member.last_changed) : undefined
      }));

      return { 
        success: true, 
        data: contacts,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: response.total_items > queryParams.offset + queryParams.count
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contacts');
    }
  }

  async deleteContact(contactId: string): Promise<ConnectorResponse<void>> {
    try {
      // Note: Requires listId, would need to be passed in customFields or stored mapping
      throw new Error('Deleting contact requires list ID in Mailchimp');
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete contact');
    }
  }

  async bulkImportContacts(operation: BulkOperation<MarketingContact>): Promise<ConnectorResponse<BulkOperationResult<MarketingContact>>> {
    try {
      const listId = operation.items[0]?.customFields?.listId;
      if (!listId) {
        throw new Error('List ID is required for bulk operations');
      }

      const members = operation.items.map(contact => ({
        email_address: contact.email,
        status: contact.status || 'subscribed',
        merge_fields: {
          FNAME: contact.firstName || '',
          LNAME: contact.lastName || '',
          PHONE: contact.phone || '',
          ...contact.customFields
        }
      }));

      const response = await this.client.lists.batchListMembers(listId, {
        members,
        sync_tags: false,
        update_existing: operation.operation === 'update'
      });

      const result: BulkOperationResult<MarketingContact> = {
        successful: response.new_members.concat(response.updated_members).map((member: any) => ({
          id: member.id,
          email: member.email_address,
          firstName: member.merge_fields?.FNAME,
          lastName: member.merge_fields?.LNAME,
          status: member.status as any
        })),
        failed: response.errors.map((error: any) => ({
          item: operation.items.find(item => item.email === error.email_address)!,
          error: {
            code: error.error_code,
            message: error.error,
            statusCode: 400
          }
        })),
        totalProcessed: operation.items.length,
        totalSuccessful: response.new_members.length + response.updated_members.length,
        totalFailed: response.errors.length
      };

      return { success: true, data: result };
    } catch (error) {
      return this.handleError(error as any, 'Failed to bulk import contacts');
    }
  }

  async createList(list: Omit<MarketingList, 'id'>): Promise<ConnectorResponse<MarketingList>> {
    try {
      const listData: Partial<MailchimpList> = {
        name: list.name,
        contact: {
          company: 'Company Name',
          address1: '123 Main St',
          city: 'City',
          state: 'State',
          zip: '12345',
          country: 'US'
        },
        permission_reminder: 'You signed up for our newsletter',
        campaign_defaults: {
          from_name: 'From Name',
          from_email: 'from@example.com',
          subject: 'Default Subject',
          language: 'en'
        },
        email_type_option: true
      };

      const response = await this.client.lists.createList(listData);

      const transformedList: MarketingList = {
        id: response.id,
        name: response.name,
        description: list.description,
        contactCount: response.stats?.member_count || 0,
        isActive: true,
        createdAt: response.date_created ? new Date(response.date_created) : new Date()
      };

      return { success: true, data: transformedList };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create list');
    }
  }

  async updateList(listId: string, updates: Partial<MarketingList>): Promise<ConnectorResponse<MarketingList>> {
    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;

      const response = await this.client.lists.updateList(listId, updateData);

      const transformedList: MarketingList = {
        id: response.id,
        name: response.name,
        description: updates.description,
        contactCount: response.stats?.member_count || 0,
        isActive: true,
        updatedAt: new Date()
      };

      return { success: true, data: transformedList };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update list');
    }
  }

  async getList(listId: string): Promise<ConnectorResponse<MarketingList>> {
    try {
      const response = await this.client.lists.getList(listId);

      const transformedList: MarketingList = {
        id: response.id,
        name: response.name,
        contactCount: response.stats?.member_count || 0,
        isActive: true,
        createdAt: response.date_created ? new Date(response.date_created) : undefined
      };

      return { success: true, data: transformedList };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get list');
    }
  }

  async getLists(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingList[]>> {
    try {
      const queryParams: any = {
        count: params?.pageSize || 50,
        offset: ((params?.page || 1) - 1) * (params?.pageSize || 50)
      };

      const response = await this.client.lists.getAllLists(queryParams);

      const lists: MarketingList[] = response.lists.map((list: MailchimpList) => ({
        id: list.id,
        name: list.name,
        contactCount: list.stats?.member_count || 0,
        isActive: true,
        createdAt: list.date_created ? new Date(list.date_created) : undefined
      }));

      return { 
        success: true, 
        data: lists,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: response.total_items > queryParams.offset + queryParams.count
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get lists');
    }
  }

  async deleteList(listId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.lists.deleteList(listId);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete list');
    }
  }

  async addContactToList(listId: string, contactId: string): Promise<ConnectorResponse<void>> {
    try {
      // In Mailchimp, contacts are always associated with a specific list
      // This would require getting the contact data and re-adding to the new list
      throw new Error('Moving contacts between lists in Mailchimp requires re-subscription');
    } catch (error) {
      return this.handleError(error as any, 'Failed to add contact to list');
    }
  }

  async removeContactFromList(listId: string, contactId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.lists.deleteListMember(listId, contactId);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to remove contact from list');
    }
  }

  async createSegment(segment: Omit<MarketingSegment, 'id'>): Promise<ConnectorResponse<MarketingSegment>> {
    try {
      if (!segment.listId) {
        throw new Error('List ID is required for Mailchimp segments');
      }

      const segmentData = {
        name: segment.name,
        static_segment: segment.criteria.type === 'static' ? segment.criteria.emails : undefined,
        options: segment.criteria.type === 'conditions' ? segment.criteria : undefined
      };

      const response = await this.client.lists.createSegment(segment.listId, segmentData);

      const transformedSegment: MarketingSegment = {
        id: response.id,
        name: response.name,
        listId: segment.listId,
        criteria: segment.criteria,
        contactCount: response.member_count || 0,
        isActive: true,
        createdAt: response.created_at ? new Date(response.created_at) : new Date()
      };

      return { success: true, data: transformedSegment };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create segment');
    }
  }

  async updateSegment(segmentId: string, updates: Partial<MarketingSegment>): Promise<ConnectorResponse<MarketingSegment>> {
    try {
      if (!updates.listId) {
        throw new Error('List ID is required for updating Mailchimp segments');
      }

      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;

      const response = await this.client.lists.updateSegment(updates.listId, segmentId, updateData);

      const transformedSegment: MarketingSegment = {
        id: response.id,
        name: response.name,
        listId: updates.listId,
        criteria: {},
        contactCount: response.member_count || 0,
        isActive: true
      };

      return { success: true, data: transformedSegment };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update segment');
    }
  }

  async getSegment(segmentId: string): Promise<ConnectorResponse<MarketingSegment>> {
    try {
      // Note: Requires listId in Mailchimp
      throw new Error('Getting segment by ID requires list ID in Mailchimp');
    } catch (error) {
      return this.handleError(error as any, 'Failed to get segment');
    }
  }

  async getSegments(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingSegment[]>> {
    try {
      const listId = params?.filters?.listId;
      if (!listId) {
        throw new Error('List ID is required to get segments from Mailchimp');
      }

      const queryParams: any = {
        count: params?.pageSize || 50,
        offset: ((params?.page || 1) - 1) * (params?.pageSize || 50)
      };

      const response = await this.client.lists.getListSegments(listId, queryParams);

      const segments: MarketingSegment[] = response.segments.map((segment: any) => ({
        id: segment.id,
        name: segment.name,
        listId: listId,
        contactCount: segment.member_count || 0,
        isActive: true,
        createdAt: segment.created_at ? new Date(segment.created_at) : undefined
      }));

      return { 
        success: true, 
        data: segments,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: response.total_items > queryParams.offset + queryParams.count
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get segments');
    }
  }

  async deleteSegment(segmentId: string): Promise<ConnectorResponse<void>> {
    try {
      // Note: Requires listId in Mailchimp
      throw new Error('Deleting segment requires list ID in Mailchimp');
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete segment');
    }
  }

  async createCampaign(campaign: Omit<EmailCampaign, 'id'>): Promise<ConnectorResponse<EmailCampaign>> {
    try {
      if (!campaign.listIds || campaign.listIds.length === 0) {
        throw new Error('At least one list ID is required for Mailchimp campaigns');
      }

      const campaignData: Partial<MailchimpCampaign> = {
        type: 'regular',
        recipients: {
          list_id: campaign.listIds[0]
        },
        settings: {
          subject_line: campaign.subject,
          from_name: campaign.fromName || 'From Name',
          reply_to: campaign.replyTo || campaign.fromEmail,
          title: campaign.name
        }
      };

      const response = await this.client.campaigns.create(campaignData);

      // Set campaign content if provided
      if (campaign.content) {
        await this.client.campaigns.setContent(response.id, {
          html: campaign.content
        });
      }

      const transformedCampaign: EmailCampaign = {
        id: response.id,
        name: response.settings.title || campaign.name,
        subject: response.settings.subject_line,
        content: campaign.content,
        fromEmail: campaign.fromEmail,
        fromName: response.settings.from_name,
        replyTo: response.settings.reply_to,
        listIds: [response.recipients.list_id],
        status: response.status as any,
        createdAt: response.create_time ? new Date(response.create_time) : new Date()
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create campaign');
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<EmailCampaign>): Promise<ConnectorResponse<EmailCampaign>> {
    try {
      const updateData: any = {};
      
      if (updates.subject || updates.name || updates.fromName || updates.replyTo) {
        updateData.settings = {};
        if (updates.subject) updateData.settings.subject_line = updates.subject;
        if (updates.name) updateData.settings.title = updates.name;
        if (updates.fromName) updateData.settings.from_name = updates.fromName;
        if (updates.replyTo) updateData.settings.reply_to = updates.replyTo;
      }

      const response = await this.client.campaigns.update(campaignId, updateData);

      if (updates.content) {
        await this.client.campaigns.setContent(campaignId, {
          html: updates.content
        });
      }

      const transformedCampaign: EmailCampaign = {
        id: response.id,
        name: response.settings.title,
        subject: response.settings.subject_line,
        content: '',
        fromEmail: response.settings.reply_to || '',
        fromName: response.settings.from_name,
        replyTo: response.settings.reply_to,
        status: response.status as any,
        updatedAt: new Date()
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update campaign');
    }
  }

  async getCampaign(campaignId: string): Promise<ConnectorResponse<EmailCampaign>> {
    try {
      const response = await this.client.campaigns.get(campaignId);

      const transformedCampaign: EmailCampaign = {
        id: response.id,
        name: response.settings.title,
        subject: response.settings.subject_line,
        content: '',
        fromEmail: response.settings.reply_to || '',
        fromName: response.settings.from_name,
        replyTo: response.settings.reply_to,
        listIds: [response.recipients.list_id],
        status: response.status as any,
        createdAt: response.create_time ? new Date(response.create_time) : undefined,
        sentAt: response.send_time ? new Date(response.send_time) : undefined
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get campaign');
    }
  }

  async getCampaigns(params?: PaginatedRequest): Promise<ConnectorResponse<EmailCampaign[]>> {
    try {
      const queryParams: any = {
        count: params?.pageSize || 50,
        offset: ((params?.page || 1) - 1) * (params?.pageSize || 50)
      };

      if (params?.filters?.status) {
        queryParams.status = params.filters.status;
      }

      const response = await this.client.campaigns.list(queryParams);

      const campaigns: EmailCampaign[] = response.campaigns.map((campaign: MailchimpCampaign) => ({
        id: campaign.id,
        name: campaign.settings.title,
        subject: campaign.settings.subject_line,
        fromName: campaign.settings.from_name,
        replyTo: campaign.settings.reply_to,
        listIds: [campaign.recipients.list_id],
        status: campaign.status as any,
        createdAt: campaign.create_time ? new Date(campaign.create_time) : undefined,
        sentAt: campaign.send_time ? new Date(campaign.send_time) : undefined
      }));

      return { 
        success: true, 
        data: campaigns,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: response.total_items > queryParams.offset + queryParams.count
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get campaigns');
    }
  }

  async deleteCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.campaigns.remove(campaignId);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete campaign');
    }
  }

  async sendCampaign(campaignId: string, scheduledAt?: Date): Promise<ConnectorResponse<void>> {
    try {
      if (scheduledAt) {
        await this.client.campaigns.schedule(campaignId, {
          schedule_time: scheduledAt.toISOString()
        });
      } else {
        await this.client.campaigns.send(campaignId);
      }
      
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to send campaign');
    }
  }

  async pauseCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.campaigns.cancelSend(campaignId);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to pause campaign');
    }
  }

  async resumeCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      // Mailchimp doesn't have a resume function, you need to reschedule or send
      await this.client.campaigns.send(campaignId);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to resume campaign');
    }
  }

  async getCampaignStats(campaignId: string): Promise<ConnectorResponse<CampaignStats>> {
    try {
      const response = await this.client.reports.getCampaignReport(campaignId);

      const stats: CampaignStats = {
        sent: response.emails_sent,
        delivered: response.emails_sent - response.bounces?.hard_bounces - response.bounces?.soft_bounces,
        opens: response.opens?.opens_total,
        uniqueOpens: response.opens?.unique_opens,
        clicks: response.clicks?.clicks_total,
        uniqueClicks: response.clicks?.unique_clicks,
        unsubscribes: response.unsubscribed,
        bounces: response.bounces?.hard_bounces + response.bounces?.soft_bounces,
        openRate: response.opens?.open_rate,
        clickRate: response.clicks?.click_rate,
        unsubscribeRate: response.unsubscribed / response.emails_sent,
        bounceRate: (response.bounces?.hard_bounces + response.bounces?.soft_bounces) / response.emails_sent
      };

      return { success: true, data: stats };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get campaign stats');
    }
  }

  async createTemplate(template: Omit<EmailTemplate, 'id'>): Promise<ConnectorResponse<EmailTemplate>> {
    try {
      const templateData = {
        name: template.name,
        html: template.content
      };

      const response = await this.client.templates.create(templateData);

      const transformedTemplate: EmailTemplate = {
        id: response.id,
        name: response.name,
        content: template.content,
        description: template.description,
        isActive: response.active,
        createdAt: response.date_created ? new Date(response.date_created) : new Date()
      };

      return { success: true, data: transformedTemplate };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create template');
    }
  }

  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<ConnectorResponse<EmailTemplate>> {
    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.content) updateData.html = updates.content;

      const response = await this.client.templates.update(templateId, updateData);

      const transformedTemplate: EmailTemplate = {
        id: response.id,
        name: response.name,
        content: updates.content || '',
        isActive: response.active,
        updatedAt: new Date()
      };

      return { success: true, data: transformedTemplate };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update template');
    }
  }

  async getTemplate(templateId: string): Promise<ConnectorResponse<EmailTemplate>> {
    try {
      const response = await this.client.templates.getTemplate(templateId);

      const transformedTemplate: EmailTemplate = {
        id: response.id,
        name: response.name,
        content: response.source,
        isActive: response.active,
        createdAt: response.date_created ? new Date(response.date_created) : undefined
      };

      return { success: true, data: transformedTemplate };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get template');
    }
  }

  async getTemplates(params?: PaginatedRequest): Promise<ConnectorResponse<EmailTemplate[]>> {
    try {
      const queryParams: any = {
        count: params?.pageSize || 50,
        offset: ((params?.page || 1) - 1) * (params?.pageSize || 50)
      };

      const response = await this.client.templates.list(queryParams);

      const templates: EmailTemplate[] = response.templates.map((template: any) => ({
        id: template.id,
        name: template.name,
        content: template.source,
        isActive: template.active,
        createdAt: template.date_created ? new Date(template.date_created) : undefined
      }));

      return { 
        success: true, 
        data: templates,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: response.total_items > queryParams.offset + queryParams.count
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get templates');
    }
  }

  async deleteTemplate(templateId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.templates.deleteTemplate(templateId);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete template');
    }
  }

  async createABTest(test: Omit<ABTest, 'id'>): Promise<ConnectorResponse<ABTest>> {
    try {
      // Mailchimp A/B testing is part of campaign creation
      const campaignData: any = {
        type: 'absplit',
        ab_split_opts: {
          split_test: test.type,
          pick_winner: test.winnerCriteria,
          wait_time: test.testDuration || 4,
          split_size: test.variants.reduce((sum, variant) => sum + variant.percentage, 0)
        }
      };

      const response = await this.client.campaigns.create(campaignData);

      const transformedTest: ABTest = {
        id: response.id,
        name: test.name,
        type: test.type,
        variants: test.variants,
        winnerCriteria: test.winnerCriteria,
        testDuration: test.testDuration,
        status: 'draft',
        createdAt: new Date()
      };

      return { success: true, data: transformedTest };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create A/B test');
    }
  }

  async getABTest(testId: string): Promise<ConnectorResponse<ABTest>> {
    try {
      const response = await this.client.campaigns.get(testId);

      if (response.type !== 'absplit') {
        throw new Error('Campaign is not an A/B test');
      }

      const transformedTest: ABTest = {
        id: response.id,
        name: response.settings.title,
        type: response.ab_split_opts?.split_test,
        winnerCriteria: response.ab_split_opts?.pick_winner,
        testDuration: response.ab_split_opts?.wait_time,
        status: response.status as any,
        variants: [],
        createdAt: response.create_time ? new Date(response.create_time) : undefined
      };

      return { success: true, data: transformedTest };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get A/B test');
    }
  }

  async getABTestResults(testId: string): Promise<ConnectorResponse<Record<string, any>>> {
    try {
      const response = await this.client.reports.getCampaignReport(testId);
      return { success: true, data: response.ab_split };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get A/B test results');
    }
  }
}