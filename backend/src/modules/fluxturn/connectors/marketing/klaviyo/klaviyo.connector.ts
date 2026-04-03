import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
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
  ABTest,
  BehaviorEvent,
  MarketingFlow
} from '../marketing.interface';

interface KlaviyoConfig {
  apiKey: string;
  privateKey?: string; // For server-side tracking
}

interface KlaviyoProfile {
  id?: string;
  type?: 'profile';
  attributes: {
    email: string;
    phone_number?: string;
    external_id?: string;
    first_name?: string;
    last_name?: string;
    organization?: string;
    locale?: string;
    title?: string;
    image?: string;
    created?: string;
    updated?: string;
    last_event_date?: string;
    location?: {
      address1?: string;
      address2?: string;
      city?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      region?: string;
      zip?: string;
      timezone?: string;
      ip?: string;
    };
    properties?: Record<string, any>;
  };
  relationships?: {
    lists?: {
      data: Array<{ type: 'list'; id: string }>;
    };
    segments?: {
      data: Array<{ type: 'segment'; id: string }>;
    };
  };
}

interface KlaviyoList {
  id?: string;
  type?: 'list';
  attributes: {
    name: string;
    created?: string;
    updated?: string;
    opt_in_process?: 'single_opt_in' | 'double_opt_in' | 'double_opt_in_sms';
  };
}

interface KlaviyoSegment {
  id?: string;
  type?: 'segment';
  attributes: {
    name: string;
    definition?: Record<string, any>;
    created?: string;
    updated?: string;
    is_active?: boolean;
    is_processing?: boolean;
    is_starred?: boolean;
  };
}

interface KlaviyoCampaign {
  id?: string;
  type?: 'campaign';
  attributes: {
    name: string;
    status?: 'draft' | 'sent' | 'sending' | 'scheduled' | 'canceled' | 'paused';
    archived?: boolean;
    audiences?: {
      included?: Array<{ type: 'list' | 'segment'; id: string }>;
      excluded?: Array<{ type: 'list' | 'segment'; id: string }>;
    };
    send_options?: {
      use_smart_sending?: boolean;
      is_abtest?: boolean;
    };
    tracking_options?: {
      is_tracking_clicks?: boolean;
      is_tracking_opens?: boolean;
      is_add_utm?: boolean;
      utm_params?: Array<{ name: string; value: string }>;
    };
    send_strategy?: {
      method?: 'immediate' | 'throttled' | 'smart_send_time';
      options_static?: {
        datetime: string;
        is_local?: boolean;
        send_past_recipients_immediately?: boolean;
      };
      options_throttled?: {
        datetime: string;
        throttle_percentage: number;
      };
      options_sto?: {
        date: string;
      };
    };
    created_at?: string;
    scheduled_at?: string;
    updated_at?: string;
    send_time?: string;
  };
}

interface KlaviyoTemplate {
  id?: string;
  type?: 'template';
  attributes: {
    name: string;
    editor_type?: 'SYSTEM_DRAGGABLE' | 'SIMPLE' | 'CODE' | 'USER_DRAGGABLE';
    html?: string;
    text?: string;
    created?: string;
    updated?: string;
  };
}

interface KlaviyoFlow {
  id?: string;
  type?: 'flow';
  attributes: {
    name: string;
    status?: 'draft' | 'manual' | 'live';
    archived?: boolean;
    created?: string;
    updated?: string;
    trigger_type?: string;
  };
}

interface KlaviyoEvent {
  type: 'event';
  attributes: {
    timestamp?: number;
    event_properties?: Record<string, any>;
    datetime?: string;
    uuid?: string;
  };
  relationships: {
    profile: {
      data: {
        type: 'profile';
        id?: string;
        attributes?: {
          email?: string;
          phone_number?: string;
          external_id?: string;
        };
      };
    };
    metric: {
      data: {
        type: 'metric';
        attributes: {
          name: string;
        };
      };
    };
  };
}

@Injectable()
export class KlaviyoConnector extends BaseConnector implements IMarketingConnector {
  private client: AxiosInstance;
  private readonly baseURL = 'https://a.klaviyo.com/api';

  constructor() {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Klaviyo',
      description: 'Email marketing and customer data platform',
      version: '1.0.0',
      category: ConnectorCategory.MARKETING,
      type: ConnectorType.KLAVIYO,
      logoUrl: 'https://www.klaviyo.com/wp-content/uploads/2022/07/klaviyo-logo.svg',
      documentationUrl: 'https://developers.klaviyo.com/',
      authType: AuthType.API_KEY,
      requiredScopes: ['profiles:read', 'profiles:write', 'lists:read', 'lists:write', 'campaigns:read', 'campaigns:write'],
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 500
      },
      actions: [
        // Profile Actions (6)
        { id: 'create_profile', name: 'Create Profile', description: 'Create or update a customer profile', inputSchema: { email: { type: 'string', required: true }, phoneNumber: { type: 'string' }, externalId: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' }, organization: { type: 'string' }, title: { type: 'string' }, image: { type: 'string' }, location: { type: 'object' }, properties: { type: 'object' } }, outputSchema: { id: { type: 'string' }, email: { type: 'string' } } },
        { id: 'get_profile', name: 'Get Profile', description: 'Get a profile by ID', inputSchema: { profileId: { type: 'string', required: true }, additionalFields: { type: 'string' } }, outputSchema: { id: { type: 'string' }, email: { type: 'string' } } },
        { id: 'update_profile', name: 'Update Profile', description: 'Update an existing profile', inputSchema: { profileId: { type: 'string', required: true }, email: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' }, phoneNumber: { type: 'string' }, properties: { type: 'object' } }, outputSchema: { id: { type: 'string' } } },
        { id: 'get_profiles', name: 'Get Profiles', description: 'Get a list of profiles', inputSchema: { filter: { type: 'string' }, pageSize: { type: 'number' } }, outputSchema: { profiles: { type: 'array' } } },
        { id: 'subscribe_profile', name: 'Subscribe Profile', description: 'Subscribe a profile to email/SMS marketing', inputSchema: { email: { type: 'string', required: true }, phoneNumber: { type: 'string' }, listId: { type: 'string', required: true }, channels: { type: 'string' } }, outputSchema: { success: { type: 'boolean' } } },
        { id: 'unsubscribe_profile', name: 'Unsubscribe Profile', description: 'Unsubscribe a profile from email/SMS marketing', inputSchema: { email: { type: 'string', required: true }, listId: { type: 'string', required: true } }, outputSchema: { success: { type: 'boolean' } } },

        // Event Actions (4)
        { id: 'create_event', name: 'Create Event', description: 'Track a custom event for a profile', inputSchema: { metricName: { type: 'string', required: true }, profileEmail: { type: 'string', required: true }, profilePhoneNumber: { type: 'string' }, profileExternalId: { type: 'string' }, properties: { type: 'object' }, value: { type: 'number' }, uniqueId: { type: 'string' }, time: { type: 'string' } }, outputSchema: { success: { type: 'boolean' } } },
        { id: 'track_event', name: 'Track Event', description: 'Track a behavioral event for a profile', inputSchema: { event: { type: 'string', required: true }, profileEmail: { type: 'string', required: true }, properties: { type: 'object' }, value: { type: 'number' } }, outputSchema: { success: { type: 'boolean' } } },
        { id: 'get_event', name: 'Get Event', description: 'Get a specific event by ID', inputSchema: { eventId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' } } },
        { id: 'get_events', name: 'Get Events', description: 'Get a list of events', inputSchema: { filter: { type: 'string' }, pageSize: { type: 'number' } }, outputSchema: { events: { type: 'array' } } },
        { id: 'get_profile_events', name: 'Get Profile Events', description: 'Get events for a specific profile', inputSchema: { profileId: { type: 'string', required: true }, pageSize: { type: 'number' } }, outputSchema: { events: { type: 'array' } } },

        // List Actions (7)
        { id: 'create_list', name: 'Create List', description: 'Create a new list', inputSchema: { name: { type: 'string', required: true }, optInProcess: { type: 'string' } }, outputSchema: { id: { type: 'string' }, name: { type: 'string' } } },
        { id: 'get_list', name: 'Get List', description: 'Get a list by ID', inputSchema: { listId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' }, name: { type: 'string' } } },
        { id: 'get_lists', name: 'Get Lists', description: 'Get all lists', inputSchema: { filter: { type: 'string' }, pageSize: { type: 'number' } }, outputSchema: { lists: { type: 'array' } } },
        { id: 'update_list', name: 'Update List', description: 'Update a list', inputSchema: { listId: { type: 'string', required: true }, name: { type: 'string' } }, outputSchema: { id: { type: 'string' } } },
        { id: 'delete_list', name: 'Delete List', description: 'Delete a list', inputSchema: { listId: { type: 'string', required: true } }, outputSchema: { success: { type: 'boolean' } } },
        { id: 'add_profile_to_list', name: 'Add Profile to List', description: 'Add profiles to a list', inputSchema: { listId: { type: 'string', required: true }, profileIds: { type: 'array', required: true } }, outputSchema: { success: { type: 'boolean' } } },
        { id: 'remove_profile_from_list', name: 'Remove Profile from List', description: 'Remove profiles from a list', inputSchema: { listId: { type: 'string', required: true }, profileIds: { type: 'array', required: true } }, outputSchema: { success: { type: 'boolean' } } },

        // Segment Actions (3)
        { id: 'get_segment', name: 'Get Segment', description: 'Get a segment by ID', inputSchema: { segmentId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' }, name: { type: 'string' } } },
        { id: 'get_segments', name: 'Get Segments', description: 'Get all segments', inputSchema: { filter: { type: 'string' }, pageSize: { type: 'number' } }, outputSchema: { segments: { type: 'array' } } },
        { id: 'get_segment_profiles', name: 'Get Segment Profiles', description: 'Get profiles in a segment', inputSchema: { segmentId: { type: 'string', required: true }, pageSize: { type: 'number' } }, outputSchema: { profiles: { type: 'array' } } },

        // Campaign Actions (7)
        { id: 'create_campaign', name: 'Create Campaign', description: 'Create a new campaign', inputSchema: { name: { type: 'string', required: true }, listIds: { type: 'array' }, segmentIds: { type: 'array' }, sendStrategy: { type: 'string' } }, outputSchema: { id: { type: 'string' }, name: { type: 'string' } } },
        { id: 'get_campaign', name: 'Get Campaign', description: 'Get a campaign by ID', inputSchema: { campaignId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' }, name: { type: 'string' } } },
        { id: 'get_campaigns', name: 'Get Campaigns', description: 'Get all campaigns', inputSchema: { filter: { type: 'string' }, pageSize: { type: 'number' } }, outputSchema: { campaigns: { type: 'array' } } },
        { id: 'update_campaign', name: 'Update Campaign', description: 'Update a campaign', inputSchema: { campaignId: { type: 'string', required: true }, name: { type: 'string' } }, outputSchema: { id: { type: 'string' } } },
        { id: 'delete_campaign', name: 'Delete Campaign', description: 'Delete a campaign', inputSchema: { campaignId: { type: 'string', required: true } }, outputSchema: { success: { type: 'boolean' } } },
        { id: 'send_campaign', name: 'Send Campaign', description: 'Send or schedule a campaign', inputSchema: { campaignId: { type: 'string', required: true }, scheduledAt: { type: 'string' } }, outputSchema: { success: { type: 'boolean' } } },
        { id: 'cancel_campaign', name: 'Cancel Campaign', description: 'Cancel a scheduled campaign', inputSchema: { jobId: { type: 'string', required: true } }, outputSchema: { success: { type: 'boolean' } } },

        // Template Actions (5)
        { id: 'create_template', name: 'Create Template', description: 'Create a new email template', inputSchema: { name: { type: 'string', required: true }, html: { type: 'string', required: true }, text: { type: 'string' }, editorType: { type: 'string' } }, outputSchema: { id: { type: 'string' }, name: { type: 'string' } } },
        { id: 'get_template', name: 'Get Template', description: 'Get a template by ID', inputSchema: { templateId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' }, name: { type: 'string' } } },
        { id: 'get_templates', name: 'Get Templates', description: 'Get all templates', inputSchema: { pageSize: { type: 'number' } }, outputSchema: { templates: { type: 'array' } } },
        { id: 'update_template', name: 'Update Template', description: 'Update a template', inputSchema: { templateId: { type: 'string', required: true }, name: { type: 'string' }, html: { type: 'string' } }, outputSchema: { id: { type: 'string' } } },
        { id: 'delete_template', name: 'Delete Template', description: 'Delete a template', inputSchema: { templateId: { type: 'string', required: true } }, outputSchema: { success: { type: 'boolean' } } },

        // Flow Actions (4)
        { id: 'create_flow', name: 'Create Flow', description: 'Create an automated email flow', inputSchema: { name: { type: 'string', required: true }, triggerType: { type: 'string', required: true }, status: { type: 'string' } }, outputSchema: { id: { type: 'string' }, name: { type: 'string' } } },
        { id: 'get_flow', name: 'Get Flow', description: 'Get a flow by ID', inputSchema: { flowId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' }, name: { type: 'string' } } },
        { id: 'get_flows', name: 'Get Flows', description: 'Get all flows', inputSchema: { filter: { type: 'string' }, pageSize: { type: 'number' } }, outputSchema: { flows: { type: 'array' } } },
        { id: 'update_flow_status', name: 'Update Flow Status', description: 'Update flow status (draft, manual, live)', inputSchema: { flowId: { type: 'string', required: true }, status: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' } } },
        { id: 'delete_flow', name: 'Delete Flow', description: 'Delete a flow', inputSchema: { flowId: { type: 'string', required: true } }, outputSchema: { success: { type: 'boolean' } } },

        // Metric Actions (2)
        { id: 'get_metric', name: 'Get Metric', description: 'Get a metric by ID', inputSchema: { metricId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' } } },
        { id: 'get_metrics', name: 'Get Metrics', description: 'Get all metrics', inputSchema: { filter: { type: 'string' }, pageSize: { type: 'number' } }, outputSchema: { metrics: { type: 'array' } } },

        // Image Actions (2)
        { id: 'upload_image', name: 'Upload Image', description: 'Upload an image to Klaviyo', inputSchema: { imageUrl: { type: 'string', required: true }, name: { type: 'string' } }, outputSchema: { id: { type: 'string' } } },
        { id: 'get_images', name: 'Get Images', description: 'Get all uploaded images', inputSchema: { pageSize: { type: 'number' } }, outputSchema: { images: { type: 'array' } } },

        // Tag Actions (4)
        { id: 'create_tag', name: 'Create Tag', description: 'Create a new tag', inputSchema: { name: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' }, name: { type: 'string' } } },
        { id: 'get_tag', name: 'Get Tag', description: 'Get a tag by ID', inputSchema: { tagId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' }, name: { type: 'string' } } },
        { id: 'get_tags', name: 'Get Tags', description: 'Get all tags', inputSchema: { pageSize: { type: 'number' } }, outputSchema: { tags: { type: 'array' } } },
        { id: 'delete_tag', name: 'Delete Tag', description: 'Delete a tag', inputSchema: { tagId: { type: 'string', required: true } }, outputSchema: { success: { type: 'boolean' } } },

        // Catalog Actions (5)
        { id: 'create_catalog_item', name: 'Create Catalog Item', description: 'Create a catalog item (product)', inputSchema: { externalId: { type: 'string', required: true }, title: { type: 'string', required: true }, description: { type: 'string' }, url: { type: 'string' }, imageUrl: { type: 'string' }, price: { type: 'number' }, published: { type: 'boolean' } }, outputSchema: { id: { type: 'string' } } },
        { id: 'get_catalog_item', name: 'Get Catalog Item', description: 'Get a catalog item by ID', inputSchema: { itemId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' } } },
        { id: 'get_catalog_items', name: 'Get Catalog Items', description: 'Get all catalog items', inputSchema: { pageSize: { type: 'number' } }, outputSchema: { items: { type: 'array' } } },
        { id: 'update_catalog_item', name: 'Update Catalog Item', description: 'Update a catalog item', inputSchema: { itemId: { type: 'string', required: true }, title: { type: 'string' }, price: { type: 'number' } }, outputSchema: { id: { type: 'string' } } },
        { id: 'delete_catalog_item', name: 'Delete Catalog Item', description: 'Delete a catalog item', inputSchema: { itemId: { type: 'string', required: true } }, outputSchema: { success: { type: 'boolean' } } },

        // Form Actions (2)
        { id: 'get_form', name: 'Get Form', description: 'Get a form by ID', inputSchema: { formId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' } } },
        { id: 'get_forms', name: 'Get Forms', description: 'Get all forms', inputSchema: { pageSize: { type: 'number' } }, outputSchema: { forms: { type: 'array' } } },

        // Coupon Actions (3)
        { id: 'create_coupon', name: 'Create Coupon', description: 'Create a coupon code', inputSchema: { code: { type: 'string', required: true }, description: { type: 'string' } }, outputSchema: { id: { type: 'string' } } },
        { id: 'get_coupon', name: 'Get Coupon', description: 'Get a coupon by ID', inputSchema: { couponId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' } } },
        { id: 'get_coupons', name: 'Get Coupons', description: 'Get all coupons', inputSchema: { pageSize: { type: 'number' } }, outputSchema: { coupons: { type: 'array' } } }
      ],
      triggers: [
        {
          id: 'profile_created',
          name: 'Profile Created',
          description: 'Triggered when a new profile is created',
          eventType: 'profile.created',
          outputSchema: {
            profileId: { type: 'string' },
            email: { type: 'string' },
            timestamp: { type: 'string' }
          },
          webhookRequired: true
        },
        {
          id: 'profile_updated',
          name: 'Profile Updated',
          description: 'Triggered when a profile is updated',
          eventType: 'profile.updated',
          outputSchema: {
            profileId: { type: 'string' },
            email: { type: 'string' },
            changes: { type: 'object' }
          },
          webhookRequired: true
        },
        {
          id: 'event_tracked',
          name: 'Event Tracked',
          description: 'Triggered when an event is tracked',
          eventType: 'event.tracked',
          outputSchema: {
            eventId: { type: 'string' },
            eventName: { type: 'string' },
            profileId: { type: 'string' },
            properties: { type: 'object' }
          },
          webhookRequired: true
        },
        {
          id: 'list_member_added',
          name: 'List Member Added',
          description: 'Triggered when a profile is added to a list',
          eventType: 'list.member_added',
          outputSchema: {
            listId: { type: 'string' },
            profileId: { type: 'string' }
          },
          webhookRequired: true
        },
        {
          id: 'list_member_removed',
          name: 'List Member Removed',
          description: 'Triggered when a profile is removed from a list',
          eventType: 'list.member_removed',
          outputSchema: {
            listId: { type: 'string' },
            profileId: { type: 'string' }
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
            sentAt: { type: 'string' }
          },
          webhookRequired: true
        },
        {
          id: 'flow_triggered',
          name: 'Flow Triggered',
          description: 'Triggered when a flow is activated for a profile',
          eventType: 'flow.triggered',
          outputSchema: {
            flowId: { type: 'string' },
            profileId: { type: 'string' }
          },
          webhookRequired: true
        }
      ],
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    const config = this.config.credentials as KlaviyoConfig;
    
    if (!config.apiKey) {
      throw new Error('Klaviyo API key is required');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Klaviyo-API-Key ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'revision': '2024-10-15'
      }
    });

    this.logger.log('Klaviyo client initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.client.get('/profiles', {
        params: { 'page[size]': 1 }
      });
      return response.status === 200;
    } catch (error) {
      throw new Error(`Klaviyo connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      const response = await this.client.get('/profiles', {
        params: { 'page[size]': 1 }
      });
      
      if (response.status !== 200) {
        throw new Error('Klaviyo API returned non-200 status');
      }
    } catch (error) {
      throw new Error(`Klaviyo health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: any): Promise<any> {
    try {
      const response = await this.client.request(request);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Profile Actions
      case 'create_profile':
        return this.createContact({
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phoneNumber,
          customFields: input.properties
        });
      case 'get_profile':
        return this.getContact(input.profileId);
      case 'update_profile':
        return this.updateContact(input.profileId, {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phoneNumber,
          customFields: input.properties
        });
      case 'get_profiles':
        return this.getContacts({ pageSize: input.pageSize });
      case 'subscribe_profile':
        return this.subscribeProfile(input);
      case 'unsubscribe_profile':
        return this.unsubscribeProfile(input);

      // Event Actions
      case 'create_event':
      case 'track_event':
        return this.trackEvent({
          event: input.metricName || input.event,
          profile: {
            email: input.profileEmail,
            phoneNumber: input.profilePhoneNumber,
            externalId: input.profileExternalId
          },
          properties: input.properties,
          value: input.value,
          timestamp: input.time ? new Date(input.time) : undefined
        });
      case 'get_event':
        return this.getEvent(input.eventId);
      case 'get_events':
        return this.getEvents(input);
      case 'get_profile_events':
        return this.getProfileEvents(input.profileId, { pageSize: input.pageSize });

      // List Actions
      case 'create_list':
        return this.createList({ name: input.name });
      case 'get_list':
        return this.getList(input.listId);
      case 'get_lists':
        return this.getLists({ pageSize: input.pageSize });
      case 'update_list':
        return this.updateList(input.listId, { name: input.name });
      case 'delete_list':
        return this.deleteList(input.listId);
      case 'add_profile_to_list':
        return this.addProfilesToList(input.listId, input.profileIds);
      case 'remove_profile_from_list':
        return this.removeProfilesFromList(input.listId, input.profileIds);

      // Segment Actions
      case 'get_segment':
        return this.getSegment(input.segmentId);
      case 'get_segments':
        return this.getSegments({ pageSize: input.pageSize });
      case 'get_segment_profiles':
        return this.getSegmentProfiles(input.segmentId, input.pageSize);

      // Campaign Actions
      case 'create_campaign':
        return this.createCampaign({
          name: input.name,
          listIds: input.listIds,
          segmentIds: input.segmentIds,
          subject: '',
          content: '',
          fromEmail: ''
        });
      case 'get_campaign':
        return this.getCampaign(input.campaignId);
      case 'get_campaigns':
        return this.getCampaigns({ pageSize: input.pageSize });
      case 'update_campaign':
        return this.updateCampaign(input.campaignId, { name: input.name });
      case 'delete_campaign':
        return this.deleteCampaign(input.campaignId);
      case 'send_campaign':
        return this.sendCampaign(input.campaignId, input.scheduledAt ? new Date(input.scheduledAt) : undefined);
      case 'cancel_campaign':
        return this.cancelCampaign(input.jobId);

      // Template Actions
      case 'create_template':
        return this.createTemplate({
          name: input.name,
          content: input.html,
          subject: ''
        });
      case 'get_template':
        return this.getTemplate(input.templateId);
      case 'get_templates':
        return this.getTemplates({ pageSize: input.pageSize });
      case 'update_template':
        return this.updateTemplate(input.templateId, {
          name: input.name,
          content: input.html
        });
      case 'delete_template':
        return this.deleteTemplate(input.templateId);

      // Flow Actions
      case 'create_flow':
        return this.createFlow({
          name: input.name,
          trigger: { type: input.triggerType || input.trigger?.type },
          actions: [],
          status: input.status
        });
      case 'get_flow':
        return this.getFlow(input.flowId);
      case 'get_flows':
        return this.getFlows({ pageSize: input.pageSize });
      case 'update_flow_status':
        return this.updateFlow(input.flowId, { status: input.status });
      case 'delete_flow':
        return this.deleteFlow(input.flowId);

      // Metric Actions
      case 'get_metric':
        return this.getMetric(input.metricId);
      case 'get_metrics':
        return this.getMetrics(input);

      // Image Actions
      case 'upload_image':
        return this.uploadImage(input);
      case 'get_images':
        return this.getImages(input);

      // Tag Actions
      case 'create_tag':
        return this.createTag(input);
      case 'get_tag':
        return this.getTag(input.tagId);
      case 'get_tags':
        return this.getTags(input);
      case 'delete_tag':
        return this.deleteTag(input.tagId);

      // Catalog Actions
      case 'create_catalog_item':
        return this.createCatalogItem(input);
      case 'get_catalog_item':
        return this.getCatalogItem(input.itemId);
      case 'get_catalog_items':
        return this.getCatalogItems(input);
      case 'update_catalog_item':
        return this.updateCatalogItem(input.itemId, input);
      case 'delete_catalog_item':
        return this.deleteCatalogItem(input.itemId);

      // Form Actions
      case 'get_form':
        return this.getForm(input.formId);
      case 'get_forms':
        return this.getForms(input);

      // Coupon Actions
      case 'create_coupon':
        return this.createCoupon(input);
      case 'get_coupon':
        return this.getCoupon(input.couponId);
      case 'get_coupons':
        return this.getCoupons(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.client = undefined as any;
  }

  // Behavioral tracking methods
  async trackEvent(event: BehaviorEvent): Promise<ConnectorResponse<void>> {
    try {
      const eventData: KlaviyoEvent = {
        type: 'event',
        attributes: {
          event_properties: event.properties,
          datetime: event.timestamp ? event.timestamp.toISOString() : new Date().toISOString()
        },
        relationships: {
          profile: {
            data: {
              type: 'profile',
              attributes: {
                email: event.profile?.email,
                ...event.profile
              }
            }
          },
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: event.event
              }
            }
          }
        }
      };

      if (event.value !== undefined) {
        eventData.attributes.event_properties = {
          ...eventData.attributes.event_properties,
          value: event.value
        };
      }

      const response = await this.client.post('/events', {
        data: eventData
      });

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to track event');
    }
  }

  async getProfileEvents(profileId: string, params?: PaginatedRequest): Promise<ConnectorResponse<BehaviorEvent[]>> {
    try {
      const queryParams: any = {
        'page[size]': params?.pageSize || 50
      };

      if (params?.page && params.page > 1) {
        queryParams['page[cursor]'] = `page_${params.page}`;
      }

      const response = await this.client.get(`/profiles/${profileId}/events`, {
        params: queryParams
      });

      const events: BehaviorEvent[] = response.data.data.map((event: any) => ({
        event: event.attributes.metric_name || 'unknown',
        profile: {
          email: event.relationships?.profile?.data?.attributes?.email || '',
          ...event.relationships?.profile?.data?.attributes
        },
        properties: event.attributes.event_properties || {},
        timestamp: event.attributes.datetime ? new Date(event.attributes.datetime) : new Date(),
        value: event.attributes.event_properties?.value
      }));

      return { 
        success: true, 
        data: events,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get profile events');
    }
  }

  // Flow management methods
  async createFlow(flow: Omit<MarketingFlow, 'id'>): Promise<ConnectorResponse<MarketingFlow>> {
    try {
      const flowData: Partial<KlaviyoFlow> = {
        type: 'flow',
        attributes: {
          name: flow.name,
          status: flow.status as any || 'draft',
          trigger_type: flow.trigger.type
        }
      };

      const response = await this.client.post('/flows', {
        data: flowData
      });

      const transformedFlow: MarketingFlow = {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        status: response.data.data.attributes.status as any,
        trigger: flow.trigger,
        actions: flow.actions,
        createdAt: response.data.data.attributes.created ? new Date(response.data.data.attributes.created) : new Date()
      };

      return { success: true, data: transformedFlow };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create flow');
    }
  }

  async updateFlow(flowId: string, updates: Partial<MarketingFlow>): Promise<ConnectorResponse<MarketingFlow>> {
    try {
      const updateData: any = {
        type: 'flow',
        id: flowId,
        attributes: {}
      };

      if (updates.name) updateData.attributes.name = updates.name;
      if (updates.status) updateData.attributes.status = updates.status;

      const response = await this.client.patch(`/flows/${flowId}`, {
        data: updateData
      });

      const transformedFlow: MarketingFlow = {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        status: response.data.data.attributes.status as any,
        trigger: { type: 'unknown' },
        actions: [],
        updatedAt: new Date()
      };

      return { success: true, data: transformedFlow };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update flow');
    }
  }

  async getFlow(flowId: string): Promise<ConnectorResponse<MarketingFlow>> {
    try {
      const response = await this.client.get(`/flows/${flowId}`);

      const flow = response.data.data;
      const transformedFlow: MarketingFlow = {
        id: flow.id,
        name: flow.attributes.name,
        status: flow.attributes.status as any,
        trigger: { type: flow.attributes.trigger_type },
        actions: [],
        createdAt: flow.attributes.created ? new Date(flow.attributes.created) : undefined,
        updatedAt: flow.attributes.updated ? new Date(flow.attributes.updated) : undefined
      };

      return { success: true, data: transformedFlow };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get flow');
    }
  }

  async getFlows(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingFlow[]>> {
    try {
      const queryParams: any = {
        'page[size]': params?.pageSize || 50
      };

      if (params?.page && params.page > 1) {
        queryParams['page[cursor]'] = `page_${params.page}`;
      }

      const response = await this.client.get('/flows', {
        params: queryParams
      });

      const flows: MarketingFlow[] = response.data.data.map((flow: KlaviyoFlow) => ({
        id: flow.id,
        name: flow.attributes.name,
        status: flow.attributes.status as any,
        trigger: { type: flow.attributes.trigger_type || 'unknown' },
        actions: [],
        createdAt: flow.attributes.created ? new Date(flow.attributes.created) : undefined,
        updatedAt: flow.attributes.updated ? new Date(flow.attributes.updated) : undefined
      }));

      return { 
        success: true, 
        data: flows,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get flows');
    }
  }

  async deleteFlow(flowId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.delete(`/flows/${flowId}`);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete flow');
    }
  }

  // IMarketingConnector implementation

  async createContact(contact: Omit<MarketingContact, 'id'>): Promise<ConnectorResponse<MarketingContact>> {
    try {
      const profileData: KlaviyoProfile = {
        type: 'profile',
        attributes: {
          email: contact.email,
          first_name: contact.firstName,
          last_name: contact.lastName,
          phone_number: contact.phone,
          properties: contact.customFields
        }
      };

      const response = await this.client.post('/profiles', {
        data: profileData
      });

      const transformedContact: MarketingContact = {
        id: response.data.data.id,
        email: response.data.data.attributes.email,
        firstName: response.data.data.attributes.first_name,
        lastName: response.data.data.attributes.last_name,
        phone: response.data.data.attributes.phone_number,
        customFields: response.data.data.attributes.properties,
        status: 'subscribed',
        createdAt: response.data.data.attributes.created ? new Date(response.data.data.attributes.created) : new Date()
      };

      return { success: true, data: transformedContact };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create contact');
    }
  }

  async updateContact(contactId: string, updates: Partial<MarketingContact>): Promise<ConnectorResponse<MarketingContact>> {
    try {
      const updateData: Partial<KlaviyoProfile> = {
        type: 'profile',
        id: contactId,
        attributes: {
          email: updates.email || ''
        }
      };

      if (updates.firstName) updateData.attributes!.first_name = updates.firstName;
      if (updates.lastName) updateData.attributes!.last_name = updates.lastName;
      if (updates.phone) updateData.attributes!.phone_number = updates.phone;
      if (updates.customFields) updateData.attributes!.properties = { ...updateData.attributes?.properties, ...updates.customFields };

      const response = await this.client.patch(`/profiles/${contactId}`, {
        data: updateData
      });

      const transformedContact: MarketingContact = {
        id: response.data.data.id,
        email: response.data.data.attributes.email,
        firstName: response.data.data.attributes.first_name,
        lastName: response.data.data.attributes.last_name,
        phone: response.data.data.attributes.phone_number,
        customFields: response.data.data.attributes.properties,
        status: 'subscribed',
        updatedAt: new Date()
      };

      return { success: true, data: transformedContact };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update contact');
    }
  }

  async getContact(contactId: string): Promise<ConnectorResponse<MarketingContact>> {
    try {
      const response = await this.client.get(`/profiles/${contactId}`);

      const profile = response.data.data;
      const transformedContact: MarketingContact = {
        id: profile.id,
        email: profile.attributes.email,
        firstName: profile.attributes.first_name,
        lastName: profile.attributes.last_name,
        phone: profile.attributes.phone_number,
        customFields: profile.attributes.properties,
        status: 'subscribed',
        createdAt: profile.attributes.created ? new Date(profile.attributes.created) : undefined,
        updatedAt: profile.attributes.updated ? new Date(profile.attributes.updated) : undefined
      };

      return { success: true, data: transformedContact };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contact');
    }
  }

  async getContacts(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingContact[]>> {
    try {
      const queryParams: any = {
        'page[size]': params?.pageSize || 50
      };

      if (params?.page && params.page > 1) {
        queryParams['page[cursor]'] = `page_${params.page}`;
      }

      const response = await this.client.get('/profiles', {
        params: queryParams
      });

      const contacts: MarketingContact[] = response.data.data.map((profile: KlaviyoProfile) => ({
        id: profile.id,
        email: profile.attributes.email,
        firstName: profile.attributes.first_name,
        lastName: profile.attributes.last_name,
        phone: profile.attributes.phone_number,
        customFields: profile.attributes.properties,
        status: 'subscribed',
        createdAt: profile.attributes.created ? new Date(profile.attributes.created) : undefined,
        updatedAt: profile.attributes.updated ? new Date(profile.attributes.updated) : undefined
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
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contacts');
    }
  }

  async deleteContact(contactId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.delete(`/profiles/${contactId}`);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete contact');
    }
  }

  async bulkImportContacts(operation: BulkOperation<MarketingContact>): Promise<ConnectorResponse<BulkOperationResult<MarketingContact>>> {
    try {
      const profiles = operation.items.map(contact => ({
        type: 'profile',
        attributes: {
          email: contact.email,
          first_name: contact.firstName,
          last_name: contact.lastName,
          phone_number: contact.phone,
          properties: contact.customFields
        }
      }));

      const response = await this.client.post('/profile-bulk-import-jobs', {
        data: {
          type: 'profile-bulk-import-job',
          attributes: {
            profiles: {
              data: profiles
            }
          }
        }
      });

      // Klaviyo returns a job ID for tracking bulk operations
      const jobId = response.data.data.id;

      const result: BulkOperationResult<MarketingContact> = {
        successful: operation.items.map(contact => ({
          ...contact,
          id: `pending_${Math.random().toString(36).substr(2, 9)}`,
          status: 'subscribed' as any,
          createdAt: new Date()
        })),
        failed: [],
        totalProcessed: operation.items.length,
        totalSuccessful: operation.items.length,
        totalFailed: 0
      };

      return { 
        success: true, 
        data: result,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to bulk import contacts');
    }
  }

  async createList(list: Omit<MarketingList, 'id'>): Promise<ConnectorResponse<MarketingList>> {
    try {
      const listData: KlaviyoList = {
        type: 'list',
        attributes: {
          name: list.name,
          opt_in_process: 'single_opt_in'
        }
      };

      const response = await this.client.post('/lists', {
        data: listData
      });

      const transformedList: MarketingList = {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        description: list.description,
        contactCount: 0,
        isActive: true,
        createdAt: response.data.data.attributes.created ? new Date(response.data.data.attributes.created) : new Date()
      };

      return { success: true, data: transformedList };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create list');
    }
  }

  async updateList(listId: string, updates: Partial<MarketingList>): Promise<ConnectorResponse<MarketingList>> {
    try {
      const updateData = {
        type: 'list',
        id: listId,
        attributes: {
          name: updates.name
        }
      };

      const response = await this.client.patch(`/lists/${listId}`, {
        data: updateData
      });

      const transformedList: MarketingList = {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        description: updates.description,
        contactCount: 0,
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
      const response = await this.client.get(`/lists/${listId}`);

      const list = response.data.data;
      const transformedList: MarketingList = {
        id: list.id,
        name: list.attributes.name,
        contactCount: 0, // Would need separate API call to get profile count
        isActive: true,
        createdAt: list.attributes.created ? new Date(list.attributes.created) : undefined,
        updatedAt: list.attributes.updated ? new Date(list.attributes.updated) : undefined
      };

      return { success: true, data: transformedList };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get list');
    }
  }

  async getLists(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingList[]>> {
    try {
      const queryParams: any = {
        'page[size]': params?.pageSize || 50
      };

      if (params?.page && params.page > 1) {
        queryParams['page[cursor]'] = `page_${params.page}`;
      }

      const response = await this.client.get('/lists', {
        params: queryParams
      });

      const lists: MarketingList[] = response.data.data.map((list: KlaviyoList) => ({
        id: list.id,
        name: list.attributes.name,
        contactCount: 0,
        isActive: true,
        createdAt: list.attributes.created ? new Date(list.attributes.created) : undefined,
        updatedAt: list.attributes.updated ? new Date(list.attributes.updated) : undefined
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
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get lists');
    }
  }

  async deleteList(listId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.delete(`/lists/${listId}`);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete list');
    }
  }

  async addContactToList(listId: string, contactId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.post(`/lists/${listId}/relationships/profiles`, {
        data: [{ type: 'profile', id: contactId }]
      });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add contact to list');
    }
  }

  async removeContactFromList(listId: string, contactId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.delete(`/lists/${listId}/relationships/profiles`, {
        data: { data: [{ type: 'profile', id: contactId }] }
      });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to remove contact from list');
    }
  }

  async createSegment(segment: Omit<MarketingSegment, 'id'>): Promise<ConnectorResponse<MarketingSegment>> {
    try {
      const segmentData: KlaviyoSegment = {
        type: 'segment',
        attributes: {
          name: segment.name,
          definition: segment.criteria,
          is_active: segment.isActive !== false
        }
      };

      const response = await this.client.post('/segments', {
        data: segmentData
      });

      const transformedSegment: MarketingSegment = {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        criteria: response.data.data.attributes.definition,
        contactCount: 0,
        isActive: response.data.data.attributes.is_active,
        createdAt: response.data.data.attributes.created ? new Date(response.data.data.attributes.created) : new Date()
      };

      return { success: true, data: transformedSegment };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create segment');
    }
  }

  async updateSegment(segmentId: string, updates: Partial<MarketingSegment>): Promise<ConnectorResponse<MarketingSegment>> {
    try {
      const updateData: any = {
        type: 'segment',
        id: segmentId,
        attributes: {}
      };

      if (updates.name) updateData.attributes.name = updates.name;
      if (updates.criteria) updateData.attributes.definition = updates.criteria;
      if (updates.isActive !== undefined) updateData.attributes.is_active = updates.isActive;

      const response = await this.client.patch(`/segments/${segmentId}`, {
        data: updateData
      });

      const transformedSegment: MarketingSegment = {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        criteria: response.data.data.attributes.definition,
        contactCount: 0,
        isActive: response.data.data.attributes.is_active
      };

      return { success: true, data: transformedSegment };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update segment');
    }
  }

  async getSegment(segmentId: string): Promise<ConnectorResponse<MarketingSegment>> {
    try {
      const response = await this.client.get(`/segments/${segmentId}`);

      const segment = response.data.data;
      const transformedSegment: MarketingSegment = {
        id: segment.id,
        name: segment.attributes.name,
        criteria: segment.attributes.definition,
        contactCount: 0,
        isActive: segment.attributes.is_active,
        createdAt: segment.attributes.created ? new Date(segment.attributes.created) : undefined
      };

      return { success: true, data: transformedSegment };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get segment');
    }
  }

  async getSegments(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingSegment[]>> {
    try {
      const queryParams: any = {
        'page[size]': params?.pageSize || 50
      };

      if (params?.page && params.page > 1) {
        queryParams['page[cursor]'] = `page_${params.page}`;
      }

      const response = await this.client.get('/segments', {
        params: queryParams
      });

      const segments: MarketingSegment[] = response.data.data.map((segment: KlaviyoSegment) => ({
        id: segment.id,
        name: segment.attributes.name,
        criteria: segment.attributes.definition,
        contactCount: 0,
        isActive: segment.attributes.is_active,
        createdAt: segment.attributes.created ? new Date(segment.attributes.created) : undefined
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
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get segments');
    }
  }

  async deleteSegment(segmentId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.delete(`/segments/${segmentId}`);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete segment');
    }
  }

  async createCampaign(campaign: Omit<EmailCampaign, 'id'>): Promise<ConnectorResponse<EmailCampaign>> {
    try {
      const campaignData: KlaviyoCampaign = {
        type: 'campaign',
        attributes: {
          name: campaign.name,
          status: 'draft',
          audiences: {
            included: [
              ...(campaign.listIds?.map(id => ({ type: 'list' as const, id: id.toString() })) || []),
              ...(campaign.segmentIds?.map(id => ({ type: 'segment' as const, id: id.toString() })) || [])
            ]
          },
          send_options: {
            use_smart_sending: true,
            is_abtest: false
          },
          tracking_options: {
            is_tracking_clicks: true,
            is_tracking_opens: true,
            is_add_utm: false
          }
        }
      };

      const response = await this.client.post('/campaigns', {
        data: campaignData
      });

      const transformedCampaign: EmailCampaign = {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        subject: campaign.subject || '',
        content: campaign.content || '',
        fromEmail: campaign.fromEmail || '',
        fromName: campaign.fromName || '',
        listIds: campaign.listIds,
        segmentIds: campaign.segmentIds,
        status: response.data.data.attributes.status as any,
        createdAt: response.data.data.attributes.created_at ? new Date(response.data.data.attributes.created_at) : new Date()
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create campaign');
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<EmailCampaign>): Promise<ConnectorResponse<EmailCampaign>> {
    try {
      const updateData: any = {
        type: 'campaign',
        id: campaignId,
        attributes: {}
      };

      if (updates.name) updateData.attributes.name = updates.name;
      
      if (updates.listIds || updates.segmentIds) {
        updateData.attributes.audiences = {
          included: [
            ...(updates.listIds?.map(id => ({ type: 'list', id: id.toString() })) || []),
            ...(updates.segmentIds?.map(id => ({ type: 'segment', id: id.toString() })) || [])
          ]
        };
      }

      const response = await this.client.patch(`/campaigns/${campaignId}`, {
        data: updateData
      });

      const transformedCampaign: EmailCampaign = {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        subject: '',
        content: '',
        fromEmail: '',
        status: response.data.data.attributes.status as any,
        updatedAt: new Date()
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update campaign');
    }
  }

  async getCampaign(campaignId: string): Promise<ConnectorResponse<EmailCampaign>> {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}`);

      const campaign = response.data.data;
      const transformedCampaign: EmailCampaign = {
        id: campaign.id,
        name: campaign.attributes.name,
        subject: '',
        content: '',
        fromEmail: '',
        status: campaign.attributes.status as any,
        createdAt: campaign.attributes.created_at ? new Date(campaign.attributes.created_at) : undefined,
        scheduledAt: campaign.attributes.scheduled_at ? new Date(campaign.attributes.scheduled_at) : undefined,
        sentAt: campaign.attributes.send_time ? new Date(campaign.attributes.send_time) : undefined
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get campaign');
    }
  }

  async getCampaigns(params?: PaginatedRequest): Promise<ConnectorResponse<EmailCampaign[]>> {
    try {
      const queryParams: any = {
        'page[size]': params?.pageSize || 50
      };

      if (params?.page && params.page > 1) {
        queryParams['page[cursor]'] = `page_${params.page}`;
      }

      const response = await this.client.get('/campaigns', {
        params: queryParams
      });

      const campaigns: EmailCampaign[] = response.data.data.map((campaign: KlaviyoCampaign) => ({
        id: campaign.id,
        name: campaign.attributes.name,
        status: campaign.attributes.status as any,
        createdAt: campaign.attributes.created_at ? new Date(campaign.attributes.created_at) : undefined,
        scheduledAt: campaign.attributes.scheduled_at ? new Date(campaign.attributes.scheduled_at) : undefined,
        sentAt: campaign.attributes.send_time ? new Date(campaign.attributes.send_time) : undefined
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
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get campaigns');
    }
  }

  async deleteCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.delete(`/campaigns/${campaignId}`);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete campaign');
    }
  }

  async sendCampaign(campaignId: string, scheduledAt?: Date): Promise<ConnectorResponse<void>> {
    try {
      const sendData: any = {
        type: 'campaign-send-job',
        attributes: {}
      };

      if (scheduledAt) {
        sendData.attributes.scheduled_at = scheduledAt.toISOString();
      }

      await this.client.post(`/campaigns/${campaignId}/send`, {
        data: sendData
      });

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to send campaign');
    }
  }

  async pauseCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.post(`/campaigns/${campaignId}/cancel`);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to pause campaign');
    }
  }

  async resumeCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      // Klaviyo doesn't have a direct resume - you need to resend
      await this.sendCampaign(campaignId);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to resume campaign');
    }
  }

  async getCampaignStats(campaignId: string): Promise<ConnectorResponse<CampaignStats>> {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}/campaign-messages`);

      if (!response.data.data.length) {
        throw new Error('No campaign messages found');
      }

      const messageId = response.data.data[0].id;
      const statsResponse = await this.client.get(`/campaign-messages/${messageId}/campaign-message-aggregate-report`);

      const stats = statsResponse.data.data.attributes;
      const campaignStats: CampaignStats = {
        sent: stats.count_sent || 0,
        delivered: stats.count_delivered || 0,
        opens: stats.count_opens || 0,
        uniqueOpens: stats.count_unique_opens || 0,
        clicks: stats.count_clicks || 0,
        uniqueClicks: stats.count_unique_clicks || 0,
        unsubscribes: stats.count_unsubscribes || 0,
        bounces: stats.count_bounced || 0,
        openRate: stats.rate_opens || 0,
        clickRate: stats.rate_clicks || 0,
        unsubscribeRate: stats.rate_unsubscribes || 0,
        bounceRate: stats.rate_bounces || 0
      };

      return { success: true, data: campaignStats };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get campaign stats');
    }
  }

  async createTemplate(template: Omit<EmailTemplate, 'id'>): Promise<ConnectorResponse<EmailTemplate>> {
    try {
      const templateData: KlaviyoTemplate = {
        type: 'template',
        attributes: {
          name: template.name,
          editor_type: 'CODE',
          html: template.content,
          text: template.content // Simplified - would normally extract text from HTML
        }
      };

      const response = await this.client.post('/templates', {
        data: templateData
      });

      const transformedTemplate: EmailTemplate = {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        subject: template.subject,
        content: response.data.data.attributes.html,
        description: template.description,
        isActive: true,
        createdAt: response.data.data.attributes.created ? new Date(response.data.data.attributes.created) : new Date()
      };

      return { success: true, data: transformedTemplate };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create template');
    }
  }

  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<ConnectorResponse<EmailTemplate>> {
    try {
      const updateData: any = {
        type: 'template',
        id: templateId,
        attributes: {}
      };

      if (updates.name) updateData.attributes.name = updates.name;
      if (updates.content) updateData.attributes.html = updates.content;

      const response = await this.client.patch(`/templates/${templateId}`, {
        data: updateData
      });

      const transformedTemplate: EmailTemplate = {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        content: response.data.data.attributes.html,
        isActive: true,
        updatedAt: new Date()
      };

      return { success: true, data: transformedTemplate };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update template');
    }
  }

  async getTemplate(templateId: string): Promise<ConnectorResponse<EmailTemplate>> {
    try {
      const response = await this.client.get(`/templates/${templateId}`);

      const template = response.data.data;
      const transformedTemplate: EmailTemplate = {
        id: template.id,
        name: template.attributes.name,
        content: template.attributes.html,
        isActive: true,
        createdAt: template.attributes.created ? new Date(template.attributes.created) : undefined,
        updatedAt: template.attributes.updated ? new Date(template.attributes.updated) : undefined
      };

      return { success: true, data: transformedTemplate };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get template');
    }
  }

  async getTemplates(params?: PaginatedRequest): Promise<ConnectorResponse<EmailTemplate[]>> {
    try {
      const queryParams: any = {
        'page[size]': params?.pageSize || 50
      };

      if (params?.page && params.page > 1) {
        queryParams['page[cursor]'] = `page_${params.page}`;
      }

      const response = await this.client.get('/templates', {
        params: queryParams
      });

      const templates: EmailTemplate[] = response.data.data.map((template: KlaviyoTemplate) => ({
        id: template.id,
        name: template.attributes.name,
        content: template.attributes.html,
        isActive: true,
        createdAt: template.attributes.created ? new Date(template.attributes.created) : undefined,
        updatedAt: template.attributes.updated ? new Date(template.attributes.updated) : undefined
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
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get templates');
    }
  }

  async deleteTemplate(templateId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.delete(`/templates/${templateId}`);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete template');
    }
  }

  async createABTest(test: Omit<ABTest, 'id'>): Promise<ConnectorResponse<ABTest>> {
    try {
      // Klaviyo A/B testing is handled at the campaign level
      throw new Error('A/B testing in Klaviyo is configured during campaign creation');
    } catch (error) {
      return this.handleError(error as any, 'Failed to create A/B test');
    }
  }

  async getABTest(testId: string): Promise<ConnectorResponse<ABTest>> {
    try {
      throw new Error('A/B test retrieval not implemented for Klaviyo');
    } catch (error) {
      return this.handleError(error as any, 'Failed to get A/B test');
    }
  }

  async getABTestResults(testId: string): Promise<ConnectorResponse<Record<string, any>>> {
    try {
      throw new Error('A/B test results not implemented for Klaviyo');
    } catch (error) {
      return this.handleError(error as any, 'Failed to get A/B test results');
    }
  }

  // Additional helper methods for new actions

  async subscribeProfile(input: any): Promise<ConnectorResponse<void>> {
    try {
      const jobData = {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          profiles: {
            data: [
              {
                type: 'profile',
                attributes: {
                  email: input.email,
                  phone_number: input.phoneNumber
                }
              }
            ]
          },
          list: {
            data: {
              type: 'list',
              id: input.listId
            }
          }
        }
      };

      await this.client.post('/profile-subscription-bulk-create-jobs', {
        data: jobData
      });

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to subscribe profile');
    }
  }

  async unsubscribeProfile(input: any): Promise<ConnectorResponse<void>> {
    try {
      const jobData = {
        type: 'profile-subscription-bulk-delete-job',
        attributes: {
          profiles: {
            data: [
              {
                type: 'profile',
                attributes: {
                  email: input.email
                }
              }
            ]
          },
          list: {
            data: {
              type: 'list',
              id: input.listId
            }
          }
        }
      };

      await this.client.post('/profile-subscription-bulk-delete-jobs', {
        data: jobData
      });

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to unsubscribe profile');
    }
  }

  async getEvent(eventId: string): Promise<ConnectorResponse<any>> {
    try {
      const response = await this.client.get(`/events/${eventId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get event');
    }
  }

  async getEvents(input: any): Promise<ConnectorResponse<any>> {
    try {
      const params: any = {
        'page[size]': input.pageSize || 20
      };

      if (input.filter) {
        params.filter = input.filter;
      }

      const response = await this.client.get('/events', { params });

      return {
        success: true,
        data: response.data.data,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: 50,
            total: 0,
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get events');
    }
  }

  async addProfilesToList(listId: string, profileIds: string[]): Promise<ConnectorResponse<void>> {
    try {
      await this.client.post(`/lists/${listId}/relationships/profiles`, {
        data: profileIds.map(id => ({ type: 'profile', id }))
      });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add profiles to list');
    }
  }

  async removeProfilesFromList(listId: string, profileIds: string[]): Promise<ConnectorResponse<void>> {
    try {
      await this.client.delete(`/lists/${listId}/relationships/profiles`, {
        data: { data: profileIds.map(id => ({ type: 'profile', id })) }
      });
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to remove profiles from list');
    }
  }

  async getSegmentProfiles(segmentId: string, pageSize?: number): Promise<ConnectorResponse<any>> {
    try {
      const params = {
        'page[size]': pageSize || 20
      };

      const response = await this.client.get(`/segments/${segmentId}/profiles`, { params });

      return {
        success: true,
        data: response.data.data,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: 50,
            total: 0,
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get segment profiles');
    }
  }

  async cancelCampaign(jobId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.post(`/campaign-send-jobs/${jobId}/cancel`);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to cancel campaign');
    }
  }

  async getMetric(metricId: string): Promise<ConnectorResponse<any>> {
    try {
      const response = await this.client.get(`/metrics/${metricId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get metric');
    }
  }

  async getMetrics(input: any): Promise<ConnectorResponse<any>> {
    try {
      const params: any = {
        'page[size]': input.pageSize || 20
      };

      if (input.filter) {
        params.filter = input.filter;
      }

      const response = await this.client.get('/metrics', { params });

      return {
        success: true,
        data: response.data.data,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: 50,
            total: 0,
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get metrics');
    }
  }

  async uploadImage(input: any): Promise<ConnectorResponse<any>> {
    try {
      const imageData = {
        type: 'image',
        attributes: {
          import_from_url: input.imageUrl,
          name: input.name
        }
      };

      const response = await this.client.post('/images', {
        data: imageData
      });

      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upload image');
    }
  }

  async getImages(input: any): Promise<ConnectorResponse<any>> {
    try {
      const params = {
        'page[size]': input.pageSize || 20
      };

      const response = await this.client.get('/images', { params });

      return {
        success: true,
        data: response.data.data,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: 50,
            total: 0,
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get images');
    }
  }

  async createTag(input: any): Promise<ConnectorResponse<any>> {
    try {
      const tagData = {
        type: 'tag',
        attributes: {
          name: input.name
        }
      };

      const response = await this.client.post('/tags', {
        data: tagData
      });

      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create tag');
    }
  }

  async getTag(tagId: string): Promise<ConnectorResponse<any>> {
    try {
      const response = await this.client.get(`/tags/${tagId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get tag');
    }
  }

  async getTags(input: any): Promise<ConnectorResponse<any>> {
    try {
      const params = {
        'page[size]': input.pageSize || 20
      };

      const response = await this.client.get('/tags', { params });

      return {
        success: true,
        data: response.data.data,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: 50,
            total: 0,
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get tags');
    }
  }

  async deleteTag(tagId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.delete(`/tags/${tagId}`);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete tag');
    }
  }

  async createCatalogItem(input: any): Promise<ConnectorResponse<any>> {
    try {
      const itemData = {
        type: 'catalog-item',
        attributes: {
          external_id: input.externalId,
          title: input.title,
          description: input.description,
          url: input.url,
          image_full_url: input.imageUrl,
          price: input.price,
          published: input.published !== false
        }
      };

      const response = await this.client.post('/catalog-items', {
        data: itemData
      });

      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create catalog item');
    }
  }

  async getCatalogItem(itemId: string): Promise<ConnectorResponse<any>> {
    try {
      const response = await this.client.get(`/catalog-items/${itemId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get catalog item');
    }
  }

  async getCatalogItems(input: any): Promise<ConnectorResponse<any>> {
    try {
      const params = {
        'page[size]': input.pageSize || 20
      };

      const response = await this.client.get('/catalog-items', { params });

      return {
        success: true,
        data: response.data.data,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: 50,
            total: 0,
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get catalog items');
    }
  }

  async updateCatalogItem(itemId: string, input: any): Promise<ConnectorResponse<any>> {
    try {
      const updateData: any = {
        type: 'catalog-item',
        id: itemId,
        attributes: {}
      };

      if (input.title) updateData.attributes.title = input.title;
      if (input.price !== undefined) updateData.attributes.price = input.price;
      if (input.description) updateData.attributes.description = input.description;

      const response = await this.client.patch(`/catalog-items/${itemId}`, {
        data: updateData
      });

      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update catalog item');
    }
  }

  async deleteCatalogItem(itemId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.client.delete(`/catalog-items/${itemId}`);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete catalog item');
    }
  }

  async getForm(formId: string): Promise<ConnectorResponse<any>> {
    try {
      const response = await this.client.get(`/forms/${formId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get form');
    }
  }

  async getForms(input: any): Promise<ConnectorResponse<any>> {
    try {
      const params = {
        'page[size]': input.pageSize || 20
      };

      const response = await this.client.get('/forms', { params });

      return {
        success: true,
        data: response.data.data,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: 50,
            total: 0,
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get forms');
    }
  }

  async createCoupon(input: any): Promise<ConnectorResponse<any>> {
    try {
      const couponData = {
        type: 'coupon',
        attributes: {
          external_id: input.code,
          description: input.description
        }
      };

      const response = await this.client.post('/coupons', {
        data: couponData
      });

      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create coupon');
    }
  }

  async getCoupon(couponId: string): Promise<ConnectorResponse<any>> {
    try {
      const response = await this.client.get(`/coupons/${couponId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get coupon');
    }
  }

  async getCoupons(input: any): Promise<ConnectorResponse<any>> {
    try {
      const params = {
        'page[size]': input.pageSize || 20
      };

      const response = await this.client.get('/coupons', { params });

      return {
        success: true,
        data: response.data.data,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: 50,
            total: 0,
            hasNext: !!response.data.links?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get coupons');
    }
  }
}